import fs from 'node:fs';
import { FrameCounter } from '../src/mp3/FrameCounter.js';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: tsx scripts/count-frames.ts <file>');
  process.exit(1);
}

const counter = new FrameCounter();
const stream = fs.createReadStream(filePath);

stream.on('data', (chunk: Buffer | string) => {
  counter.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
});

stream.on('error', (error: Error) => {
  console.error(error.message);
  process.exit(1);
});

stream.on('end', () => {
  console.log(JSON.stringify({ frameCount: counter.finish() }));
});
