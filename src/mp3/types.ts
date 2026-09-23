export type ChannelMode = 'stereo' | 'jointStereo' | 'dualChannel' | 'mono';

export interface ParsedFrameHeader {
  frameLength: number;
  bitrateKbps: number;
  sampleRateHz: number;
  padded: boolean;
  channelMode: ChannelMode;
}
