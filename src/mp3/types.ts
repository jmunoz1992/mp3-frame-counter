export type ChannelMode = 'stereo' | 'jointStereo' | 'dualChannel' | 'mono';

export interface ParsedFrameHeader {
  frameLength: number;
  bitrateKbps: number;
  sampleRateHz: number;
  padded: boolean;
  channelMode: ChannelMode;
}

/** Thrown when a stream contains no supported MPEG-1 Layer III frames. */
export class Mp3ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Mp3ParseError';
  }
}
