import request from 'supertest';
import { createApp } from '../../src/app.js';
import { buildFrame, buildMp3, type FrameSpec } from '../helpers/buildMp3.js';

const CBR_FRAME: FrameSpec = { bitrateKbps: 128, sampleRateHz: 44100 };

const app = createApp();

describe('POST /file-upload', () => {
  it('returns the frame count for a valid MP3', async () => {
    const mp3 = buildMp3(
      Array.from({ length: 25 }, () => buildFrame(CBR_FRAME)),
    );

    const res = await request(app)
      .post('/file-upload')
      .attach('file', mp3, { filename: 'song.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ frameCount: 25 });
  });

  it('returns 400 when the form contains no file', async () => {
    const res = await request(app)
      .post('/file-upload')
      .field('note', 'no file here');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it('returns 400 for a non-multipart request', async () => {
    const res = await request(app)
      .post('/file-upload')
      .send({ file: 'not a file' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it('returns 400 when the file is not an MP3', async () => {
    const garbage = Buffer.from(
      'this is definitely not an mp3 file\n'.repeat(200),
    );

    const res = await request(app)
      .post('/file-upload')
      .attach('file', garbage, {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('returns 404 with an error body', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
