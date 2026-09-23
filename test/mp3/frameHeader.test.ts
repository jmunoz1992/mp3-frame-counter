import { parseFrameHeader } from '../../src/mp3/frameHeader.js';

describe('parseFrameHeader', () => {
  it('returns frameLength 417 for a 128 kbps / 44100 Hz header', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0x90, // 1001 0000  bitrate=1001 (128 kbps), sampleRate=00 (44100 Hz), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toEqual({
      frameLength: 417,
      bitrateKbps: 128,
      sampleRateHz: 44100,
      padded: false,
      channelMode: 'stereo',
    });
  });

  it('adds exactly 1 byte to frameLength when the padding bit is set', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0x92, // 1001 0010  bitrate=1001 (128 kbps), sampleRate=00 (44100 Hz), padding=1, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toEqual({
      frameLength: 417 + 1,
      bitrateKbps: 128,
      sampleRateHz: 44100,
      padded: true,
      channelMode: 'stereo',
    });
  });

  it('returns null when the sync byte is wrong', () => {
    const buffer = Buffer.from([
      0xfe, // 1111 1110  sync broken (must be 1111 1111)
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0x90, // 1001 0000  bitrate=1001 (128 kbps), sampleRate=00 (44100 Hz), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });

  it('returns null for MPEG Version 2', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xf3, // 1111 0011  sync=111, version=10 (MPEG2), layer=01 (III), protection=1
      0x90, // 1001 0000  bitrate=1001 (128 kbps), sampleRate=00 (44100 Hz), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });

  it('returns null for Layer II', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfd, // 1111 1101  sync=111, version=11 (MPEG1), layer=10 (II), protection=1
      0x90, // 1001 0000  bitrate=1001 (128 kbps), sampleRate=00 (44100 Hz), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });

  it('returns null for a free bitrate (index 0)', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0x00, // 0000 0000  bitrate=0000 (free), sampleRate=00 (44100 Hz), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });

  it('returns null for a bad bitrate (index 15)', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0xf0, // 1111 0000  bitrate=1111 (bad), sampleRate=00 (44100 Hz), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });

  it('returns null for a reserved sample rate (index 3)', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0x9c, // 1001 1100  bitrate=1001 (128 kbps), sampleRate=11 (reserved), padding=0, private=0
      0x00, // 0000 0000  channelMode=00 (stereo)
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });

  it('returns null when the buffer is shorter than 4 bytes', () => {
    const buffer = Buffer.from([
      0xff, // 1111 1111  sync
      0xfb, // 1111 1011  sync=111, version=11 (MPEG1), layer=01 (III), protection=1
      0x90, // 1001 0000  bitrate=1001 (128 kbps), sampleRate=00 (44100 Hz), padding=0, private=0
    ]);

    expect(parseFrameHeader(buffer, 0)).toBeNull();
  });
});
