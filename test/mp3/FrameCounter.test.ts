import fs from 'node:fs';
import path from 'node:path';
import {
  FrameCounter,
  countFramesInBuffer,
} from '../../src/mp3/FrameCounter.js';
import { Mp3ParseError } from '../../src/mp3/types.js';
import { buildFrame, buildMp3, type FrameSpec } from '../helpers/buildMp3.js';

const CBR_FRAME: FrameSpec = { bitrateKbps: 128, sampleRateHz: 44100 };

function id3v2Tag(body: Buffer): Buffer {
  const header = Buffer.alloc(10);
  header.write('ID3', 0, 'ascii');
  header[3] = 0x04;

  let size = body.length;
  for (let i = 3; i >= 0; i--) {
    header[6 + i] = size & 0x7f;
    size >>= 7;
  }

  return Buffer.concat([header, body]);
}

describe('countFramesInBuffer', () => {
  it('counts a single frame', () => {
    const buffer = buildMp3([buildFrame(CBR_FRAME)]);

    expect(countFramesInBuffer(buffer)).toBe(1);
  });

  it('counts 50 frames at a constant bitrate', () => {
    const buffer = buildMp3(
      Array.from({ length: 50 }, () => buildFrame(CBR_FRAME)),
    );

    expect(countFramesInBuffer(buffer)).toBe(50);
  });

  it('counts frames with varying bitrates', () => {
    const bitrates = [96, 128, 160, 192, 256, 320, 128, 192];
    const buffer = buildMp3(
      bitrates.map((bitrateKbps) =>
        buildFrame({ bitrateKbps, sampleRateHz: 44100 }),
      ),
    );

    expect(countFramesInBuffer(buffer)).toBe(bitrates.length);
  });

  it('skips a leading ID3v2 tag before counting', () => {
    const hiddenInTag = buildFrame({ bitrateKbps: 128, sampleRateHz: 44100 });
    const audio = buildMp3([
      buildFrame({ bitrateKbps: 192, sampleRateHz: 44100 }),
      buildFrame({ bitrateKbps: 160, sampleRateHz: 44100 }),
      buildFrame({ bitrateKbps: 320, sampleRateHz: 44100 }),
    ]);
    const buffer = Buffer.concat([id3v2Tag(hiddenInTag), audio]);

    expect(countFramesInBuffer(buffer)).toBe(3);
  });

  it('does not count a leading Xing VBR header frame', () => {
    const audio = [
      buildFrame({ bitrateKbps: 192, sampleRateHz: 44100 }),
      buildFrame({ bitrateKbps: 160, sampleRateHz: 44100 }),
    ];

    expect(countFramesInBuffer(buildMp3([xingFrame(), ...audio]))).toBe(2);
    expect(countFramesInBuffer(buildMp3([xingFrame('mono'), ...audio]))).toBe(
      2,
    );
    expect(
      countFramesInBuffer(buildMp3([xingFrame('stereo', true), ...audio])),
    ).toBe(2);
  });

  it('counts a leading Info tag frame', () => {
    const buffer = buildMp3([
      tagFrame('Info'),
      buildFrame({ bitrateKbps: 128, sampleRateHz: 44100 }),
    ]);

    expect(countFramesInBuffer(buffer)).toBe(2);
  });

  it('throws Mp3ParseError when the buffer has no valid frames', () => {
    const buffer = Buffer.from([0xff, 0xe0, 0x00, 0x00, 0x11, 0x22, 0x33]);

    expect(() => countFramesInBuffer(buffer)).toThrow(Mp3ParseError);
  });
});

describe('FrameCounter', () => {
  it('returns the same count for one write, byte-at-a-time writes, and 37-byte chunks', () => {
    const frameCount = 30;
    const bitrates = [96, 128, 160, 192, 256, 320];
    const buffer = buildMp3(
      Array.from({ length: frameCount }, (_, index) =>
        buildFrame({
          bitrateKbps: bitrates[index % bitrates.length],
          sampleRateHz: 44100,
          padded: index % 3 === 0,
        }),
      ),
    );

    const allAtOnce = new FrameCounter();
    allAtOnce.write(buffer);

    const oneByteAtATime = new FrameCounter();
    for (let offset = 0; offset < buffer.length; offset++) {
      oneByteAtATime.write(buffer.subarray(offset, offset + 1));
    }

    const oddChunks = new FrameCounter();
    const chunkSize = 37;
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      oddChunks.write(buffer.subarray(offset, offset + chunkSize));
    }

    expect(allAtOnce.finish()).toBe(frameCount);
    expect(oneByteAtATime.finish()).toBe(frameCount);
    expect(oddChunks.finish()).toBe(frameCount);
  });

  it('skips a Xing header when that frame arrives in pieces', () => {
    const buffer = buildMp3([
      xingFrame(),
      buildFrame(CBR_FRAME),
      buildFrame(CBR_FRAME),
    ]);
    const counter = new FrameCounter();

    for (let offset = 0; offset < buffer.length; offset += 50) {
      counter.write(buffer.subarray(offset, offset + 50));
    }

    expect(counter.finish()).toBe(2);
  });
});

// Expected counts are MediaInfo's "Frame count". ffprobe reports 78 for the
// CBR file with a LAME Info frame because it skips that frame; MediaInfo
// counts it. The README's "Test fixtures" section shows how they were made.
describe('real LAME-encoded files', () => {
  const fixtures = [
    { file: 'cbr-128k-id3v2.mp3', frameCount: 79 },
    { file: 'cbr-128k-no-tag.mp3', frameCount: 78 },
    { file: 'vbr-v2-id3v2.mp3', frameCount: 78 },
  ];

  it.each(fixtures)(
    '$file has $frameCount frames',
    async ({ file, frameCount }) => {
      const counter = new FrameCounter();
      const stream = fs.createReadStream(
        path.join(__dirname, '..', 'fixtures', file),
        { highWaterMark: 1000 },
      );
      for await (const chunk of stream) {
        counter.write(chunk as Buffer);
      }

      expect(counter.finish()).toBe(frameCount);
    },
  );
});

function tagFrame(
  tag: 'Xing' | 'Info',
  channelMode: 'stereo' | 'mono' = 'stereo',
  crc = false,
): Buffer {
  const frame = buildFrame({ bitrateKbps: 128, sampleRateHz: 44100 });
  if (channelMode === 'mono') {
    frame[3] = (frame[3] & 0x3f) | 0xc0;
  }
  if (crc) {
    frame[1] &= ~0x01;
  }

  const sideInfoSize = channelMode === 'mono' ? 17 : 32;
  const tagOffset = 4 + (crc ? 2 : 0) + sideInfoSize;
  frame.write(tag, tagOffset, 'ascii');
  return frame;
}

function xingFrame(
  channelMode: 'stereo' | 'mono' = 'stereo',
  crc = false,
): Buffer {
  return tagFrame('Xing', channelMode, crc);
}
