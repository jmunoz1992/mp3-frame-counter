export const ID3V2_HEADER_SIZE = 10;

const ID3_MAGIC = 'ID3';
const FOOTER_PRESENT_FLAG = 0x10;

export function readId3v2Header(buffer: Buffer): { totalSize: number } | null {
  if (buffer.length < ID3V2_HEADER_SIZE) {
    throw new RangeError(
      `ID3v2 header requires at least ${ID3V2_HEADER_SIZE} bytes, got ${buffer.length}`,
    );
  }

  if (buffer.toString('ascii', 0, 3) !== ID3_MAGIC) {
    return null;
  }

  const footerPresent = (buffer[5] & FOOTER_PRESENT_FLAG) !== 0;

  // Synchsafe integer: 7 data bits per byte, not 8. The high bit of each size
  // byte is always 0 so the field can never contain 0xFF, which would look
  // like an MPEG frame sync (0xFF followed by 111xxxxx).
  const size =
    ((buffer[6] & 0x7f) << 21) |
    ((buffer[7] & 0x7f) << 14) |
    ((buffer[8] & 0x7f) << 7) |
    (buffer[9] & 0x7f);

  const footerSize = footerPresent ? ID3V2_HEADER_SIZE : 0;
  return { totalSize: ID3V2_HEADER_SIZE + size + footerSize };
}
