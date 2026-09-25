import {
  FRAME_HEADER_SIZE,
  MPEG1_LAYER_III_BITRATES_KBPS,
  MPEG1_SAMPLE_RATES_HZ,
  MpegLayer,
  MpegVersion,
} from './constants.js';
import type { ChannelMode, ParsedFrameHeader } from './types.js';

const CHANNEL_MODES: readonly ChannelMode[] = [
  'stereo',
  'jointStereo',
  'dualChannel',
  'mono',
];

/** True when byte 0 is 0xFF and bits 7-5 of byte 1 complete the 11-bit sync word. */
export function isFrameSync(byte0: number, byte1: number): boolean {
  const syncBits = byte1 & 0xe0; // bits 7-5: frame sync
  return byte0 === 0xff && syncBits === 0xe0;
}

/**
 * Read the 4-byte header at `offset` and return it when it is a usable
 * MPEG-1 Layer III frame. Returns null for a short buffer, a bad sync word,
 * any other version or layer, a free/bad bitrate, or a reserved sample rate.
 */
export function parseFrameHeader(
  buffer: Buffer,
  offset: number,
): ParsedFrameHeader | null {
  if (offset < 0 || offset + FRAME_HEADER_SIZE > buffer.length) {
    return null;
  }

  const byte0 = buffer[offset];
  const byte1 = buffer[offset + 1];
  const byte2 = buffer[offset + 2];
  const byte3 = buffer[offset + 3];

  if (!isFrameSync(byte0, byte1)) {
    return null;
  }

  const versionId = (byte1 & 0x18) >> 3; // bits 4-3: MPEG Audio Version ID
  if (versionId !== MpegVersion.MPEG1) {
    return null;
  }

  const layer = (byte1 & 0x06) >> 1; // bits 2-1: Layer
  if (layer !== MpegLayer.LayerIII) {
    return null;
  }

  const bitrateIndex = (byte2 & 0xf0) >> 4; // bits 7-4: bitrate index
  const bitrateKbps = MPEG1_LAYER_III_BITRATES_KBPS[bitrateIndex];
  if (bitrateKbps == null) {
    return null;
  }

  const sampleRateIndex = (byte2 & 0x0c) >> 2; // bits 3-2: sampling rate index
  const sampleRateHz = MPEG1_SAMPLE_RATES_HZ[sampleRateIndex];
  if (sampleRateHz == null) {
    return null;
  }

  const paddingBit = (byte2 & 0x02) >> 1; // bit 1: padding bit
  const padded = paddingBit === 1;

  const channelModeIndex = (byte3 & 0xc0) >> 6; // bits 7-6: channel mode
  const channelMode = CHANNEL_MODES[channelModeIndex];
  if (channelMode === undefined) {
    return null;
  }

  // Private (byte 2 bit 0) is unused. Protection (byte 1 bit 0) only
  // changes where a Xing tag sits; see isXingVbrHeader.
  const frameLength =
    Math.floor((144 * bitrateKbps * 1000) / sampleRateHz) + (padded ? 1 : 0);

  return {
    frameLength,
    bitrateKbps,
    sampleRateHz,
    padded,
    channelMode,
  };
}

const XING_TAG = 'Xing';
const CRC_SIZE = 2;
// MPEG-1 Layer III side info follows the header (and CRC, if present).
const SIDE_INFO_SIZE_MONO = 17;
const SIDE_INFO_SIZE_NOT_MONO = 32;

/**
 * True when the frame at `offset` is a Xing VBR header. The tag sits at the
 * start of the audio data, immediately after the side information. LAME CBR
 * files use "Info" in that slot; MediaInfo counts those frames, so they return
 * false.
 */
export function isXingVbrHeader(
  buffer: Buffer,
  offset: number,
  header: ParsedFrameHeader,
): boolean {
  const protectionBit = buffer[offset + 1] & 0x01;
  const crcSize = protectionBit === 0 ? CRC_SIZE : 0;
  const sideInfoSize =
    header.channelMode === 'mono'
      ? SIDE_INFO_SIZE_MONO
      : SIDE_INFO_SIZE_NOT_MONO;
  const tagOffset = offset + FRAME_HEADER_SIZE + crcSize + sideInfoSize;

  if (tagOffset + XING_TAG.length > offset + header.frameLength) {
    return false;
  }

  return (
    buffer.toString('ascii', tagOffset, tagOffset + XING_TAG.length) ===
    XING_TAG
  );
}
