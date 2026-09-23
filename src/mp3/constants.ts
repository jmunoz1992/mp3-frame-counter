/** MPEG Audio Version ID from header byte 1, bits 4-3. */
export enum MpegVersion {
  /** 00 */
  MPEG25 = 0b00,
  /** 01 */
  Reserved = 0b01,
  /** 10 */
  MPEG2 = 0b10,
  /** 11 */
  MPEG1 = 0b11,
}

/** Layer description from header byte 1, bits 2-1. */
export enum MpegLayer {
  /** 00 */
  Reserved = 0b00,
  /** 01 */
  LayerIII = 0b01,
  /** 10 */
  LayerII = 0b10,
  /** 11 */
  LayerI = 0b11,
}

export const FRAME_HEADER_SIZE = 4;

/**
 * Bitrate in kbps for MPEG-1 Layer III, indexed by the 4-bit bitrate index.
 * Index 0 is "free" and index 15 is "bad"; both are unusable.
 */
export const MPEG1_LAYER_III_BITRATES_KBPS: readonly (number | null)[] = [
  null,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320,
  null,
];

/**
 * Sample rate in Hz for MPEG-1, indexed by the 2-bit sampling rate index.
 * Index 3 is reserved.
 */
export const MPEG1_SAMPLE_RATES_HZ: readonly (number | null)[] = [
  44100,
  48000,
  32000,
  null,
];
