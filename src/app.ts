import express, { type Express } from 'express';
import { HttpError } from './errors/HttpError.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fileUploadRouter } from './routes/fileUpload.js';

export function createApp(): Express {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(fileUploadRouter);

  app.use((req, _res, next) => {
    next(new HttpError(404, `Cannot ${req.method} ${req.path}`));
  });

  app.use(errorHandler);

  return app;
}
