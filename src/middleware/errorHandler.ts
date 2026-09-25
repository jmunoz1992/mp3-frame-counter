import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../errors/HttpError.js';
import { Mp3ParseError } from '../mp3/types.js';

// Express only treats middleware as an error handler when it declares all four parameters.
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Mp3ParseError) {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
