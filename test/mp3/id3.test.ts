import { readId3v2Header } from '../../src/mp3/id3';

describe('readId3v2Header', () => {
  it('returns null when the buffer does not start with ID3', () => {
    const buffer = Buffer.from([
      0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    expect(readId3v2Header(buffer)).toBeNull();
  });

  it('decodes a small tag of about 100 bytes', () => {
    // Synchsafe size 100 (0x64) sits entirely in the last byte.
    // totalSize = 10-byte header + 100.
    const buffer = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64,
    ]);

    expect(readId3v2Header(buffer)).toEqual({ totalSize: 110 });
  });

  it('decodes a large tag above 16KB using the higher synchsafe bytes', () => {
    // 0x01 << 21 | 0x02 << 14 = 2_097_152 + 32_768 = 2_129_920, past 16KB
    // so the << 21 and << 14 shifts both contribute.
    // totalSize = 10-byte header + 2_129_920.
    const buffer = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x01, 0x02, 0x00, 0x00,
    ]);

    expect(readId3v2Header(buffer)).toEqual({ totalSize: 2_129_930 });
  });

  it('throws RangeError when the buffer is shorter than 10 bytes', () => {
    expect(() => readId3v2Header(Buffer.alloc(9))).toThrow(RangeError);
  });
});
