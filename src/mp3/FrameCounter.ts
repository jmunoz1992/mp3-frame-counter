import { FRAME_HEADER_SIZE } from './constants.js';
import { parseFrameHeader } from './frameHeader.js';
import { ID3V2_HEADER_SIZE, readId3v2Header } from './id3.js';
import { Mp3ParseError } from './types.js';

/**
 * Counts MPEG-1 Layer III frames from a byte stream fed one chunk at a time.
 * Incomplete headers, frames, and ID3v2 tags stay in `carry` until a later
 * `write` provides the rest.
 */
export class FrameCounter {
  private carry: Buffer = Buffer.alloc(0);
  private frameCount = 0;
  private id3Checked = false;
  private id3BytesRemainingToSkip = 0;

  write(chunk: Buffer): void {
    let buffer = Buffer.concat([this.carry, chunk]);
    this.carry = Buffer.alloc(0);

    if (!this.id3Checked) {
      if (buffer.length < ID3V2_HEADER_SIZE) {
        this.carry = buffer;
        return;
      }

      const id3 = readId3v2Header(buffer);
      this.id3Checked = true;
      this.id3BytesRemainingToSkip = id3?.totalSize ?? 0;
    }

    if (this.id3BytesRemainingToSkip > 0) {
      const skip = Math.min(this.id3BytesRemainingToSkip, buffer.length);
      buffer = buffer.subarray(skip);
      this.id3BytesRemainingToSkip -= skip;
      if (this.id3BytesRemainingToSkip > 0) {
        return;
      }
    }

    let offset = 0;
    while (offset < buffer.length) {
      // Fewer than 4 bytes left may be the start of a header that finishes
      // in the next chunk. Leave them in carry instead of skipping them.
      if (offset + FRAME_HEADER_SIZE > buffer.length) {
        break;
      }

      const header = parseFrameHeader(buffer, offset);
      if (header === null) {
        offset += 1;
        continue;
      }

      if (offset + header.frameLength > buffer.length) {
        break;
      }

      this.frameCount += 1;
      offset += header.frameLength;
    }

    this.carry = buffer.subarray(offset);
  }

  finish(): number {
    if (this.frameCount === 0) {
      throw new Mp3ParseError('No valid MPEG-1 Layer III frames found');
    }
    return this.frameCount;
  }
}

/** Count frames when the whole file is already in memory. */
export function countFramesInBuffer(buffer: Buffer): number {
  const counter = new FrameCounter();
  counter.write(buffer);
  return counter.finish();
}
