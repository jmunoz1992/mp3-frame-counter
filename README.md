# mp3-frame-counter

Express and TypeScript API that counts MPEG-1 Layer III frames in an uploaded MP3.

`POST /file-upload` accepts `multipart/form-data` with a file field named `file` and returns `200` with:

```json
{ "frameCount": 1234 }
```

## Requirements

Node.js 18.14 or newer. The versions Jest will run on are `^18.14.0`, `^20`, `^22`, and `>=24`. Express 5 requires Node.js 18 or later.

## Getting started

```bash
npm install
npm run build
npm start
```

The server listens on port 3000. Set `PORT` to use another port. The upload limit is 500 MiB (524288000 bytes). Set `MAX_UPLOAD_SIZE_BYTES` to change it.

## Testing the endpoint

With the server running:

```bash
curl -s -F "file=@song.mp3" http://localhost:3000/file-upload
```

```json
{ "frameCount": 1234 }
```

## Running the automated tests

```bash
npm test
npm run lint
npm run typecheck
```

## How it works

`parseFrameHeader` reads a 4-byte MPEG header. It accepts the header when the 11-bit sync word is present (`0xFF` and the top three bits of the next byte), the version is MPEG-1, the layer is Layer III, the bitrate index maps to 32–320 kbps, and the sample rate is 44100, 48000, or 32000 Hz. Frame length is `floor(144 * bitrateKbps * 1000 / sampleRateHz)`, plus one byte when the padding bit is set. The counter advances by that length. Bytes that fail the header checks are skipped one at a time. A leading ID3v2 tag is skipped before the scan: its size is the synchsafe integer in the 10-byte header, plus a 10-byte footer when the footer flag is set.

The first accepted frame is checked for a Xing VBR header. The ASCII tag `Xing` sits at the start of the audio data, after the 4-byte header, a 2-byte CRC when the protection bit is clear, and the side information (17 bytes for mono, 32 bytes otherwise). That frame is a valid MPEG frame whose payload is a VBR index, so it is left out of `frameCount`. ffprobe and MediaInfo leave this header frame out of their frame counts for the same reason. A CBR file may put an `Info` tag in that same slot; the frame still carries audio, so it stays in the count. A VBRI header is counted as an ordinary audio frame.

`POST /file-upload` pipes the request into busboy. Each chunk of the `file` field is passed to `FrameCounter.write()`. A header, frame, or ID3 tag split across chunks stays in a carry buffer until a later chunk completes it. The whole file is never buffered.

## Error handling

Error responses are JSON: `{ "error": "<message>" }`.

- **400** when the request is not `multipart/form-data` (`Content-Type must be multipart/form-data`), the multipart body is malformed (`Malformed multipart/form-data request`), the `file` field is missing (`No file was found in the "file" form field`), or the upload contains no MPEG-1 Layer III frames (`No valid MPEG-1 Layer III frames found`).
- **413** when the file is larger than `MAX_UPLOAD_SIZE_BYTES` (`File exceeds the <limit>-byte upload limit`).
- **500** for any other failure (`Internal server error`). The error is logged on the server.

Unknown routes return **404** with the same JSON shape (`Cannot <method> <path>`).

## Known limitations

- Free-format bitrate (bitrate index 0) is unsupported. The bitrate table has no rate for that index, so the header is rejected and a frame length cannot be computed.
- There is no second-sync check. After a header yields a frame length, the parser advances by that length without confirming a sync word at the next frame.
- A VBRI header frame is included in `frameCount`.

## Project structure

```
src/
  server.ts                    # listens on PORT
  app.ts                       # Express app, /health, routes, 404, error handler
  config.ts                    # PORT, upload field name, size limit
  routes/fileUpload.ts         # POST /file-upload
  middleware/errorHandler.ts   # maps errors to JSON status codes
  errors/HttpError.ts          # error with an HTTP status
  mp3/FrameCounter.ts          # streaming frame count
  mp3/frameHeader.ts           # MPEG header parse and Xing detection
  mp3/id3.ts                   # ID3v2 header size
  mp3/constants.ts             # bitrate and sample-rate tables
  mp3/types.ts                 # parsed header type and Mp3ParseError
test/
  routes/fileUpload.test.ts    # endpoint status codes and frameCount
  mp3/FrameCounter.test.ts     # counts, ID3 skip, Xing skip, chunked writes
  mp3/frameHeader.test.ts      # header fields and rejected headers
  mp3/id3.test.ts              # synchsafe ID3v2 size
  helpers/buildMp3.ts          # synthetic MPEG frames for tests
```
