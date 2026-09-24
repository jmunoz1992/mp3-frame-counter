import {
  MPEG1_LAYER_III_BITRATES_KBPS,
  MPEG1_SAMPLE_RATES_HZ,
  MpegLayer,
  MpegVersion,
} from '../../src/mp3/constants.js';

export interface FrameSpec {
  bitrateKbps: number;
  sampleRateHz: number;
  padded?: boolean;
}

function indexIn(
  table: readonly (number | null)[],
  value: number,
  label: string,
): number {
  const index = table.findIndex((entry) => entry === value);
  if (index === -1) {
    throw new Error(`Unsupported MPEG-1 Layer III ${label}: ${value}`);
  }
  return index;
}

/** A real MPEG-1 Layer III header followed by a zeroed body of the correct length. */
export function buildFrame(spec: FrameSpec): Buffer {
  const bitrateIndex = indexIn(
    MPEG1_LAYER_III_BITRATES_KBPS,
    spec.bitrateKbps,
    'bitrate',
  );
  const sampleRateIndex = indexIn(
    MPEG1_SAMPLE_RATES_HZ,
    spec.sampleRateHz,
    'sample rate',
  );
  const padded = spec.padded ?? false;
  const frameLength =
    Math.floor((144 * spec.bitrateKbps * 1000) / spec.sampleRateHz) +
    (padded ? 1 : 0);

  const frame = Buffer.alloc(frameLength);
  frame[0] = 0xff;
  // Sync bits 7-5, MPEG-1, Layer III, protection bit set (no CRC).
  frame[1] = 0xe0 | (MpegVersion.MPEG1 << 3) | (MpegLayer.LayerIII << 1) | 0x01;
  frame[2] =
    (bitrateIndex << 4) | (sampleRateIndex << 2) | ((padded ? 1 : 0) << 1);
  frame[3] = 0x00; // stereo
  return frame;
}

/** Concatenate already-built frames into one buffer. */
export function buildMp3(frames: Buffer[]): Buffer {
  return Buffer.concat(frames);
}
