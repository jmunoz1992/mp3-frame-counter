import busboy from 'busboy';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { MAX_UPLOAD_SIZE_BYTES, UPLOAD_FIELD_NAME } from '../config.js';
import { HttpError } from '../errors/HttpError.js';
import { FrameCounter } from '../mp3/FrameCounter.js';

export const fileUploadRouter = Router();

fileUploadRouter.post(
  '/file-upload',
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      next(new HttpError(400, 'Content-Type must be multipart/form-data'));
      return;
    }

    let bb: busboy.Busboy;
    try {
      bb = busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_UPLOAD_SIZE_BYTES },
      });
    } catch {
      next(new HttpError(400, 'Malformed multipart/form-data request'));
      return;
    }

    const counter = new FrameCounter();
    let settled = false;
    let fileSeen = false;
    let parseFailed = false;
    let fileTooLarge = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      next(err);
    };

    bb.on('file', (name, file) => {
      if (fileSeen || name !== UPLOAD_FIELD_NAME) {
        file.resume();
        return;
      }
      fileSeen = true;

      file.on('data', (chunk: Buffer) => {
        if (parseFailed) return;
        try {
          counter.write(chunk);
        } catch (err) {
          parseFailed = true;
          fail(err);
        }
      });
      file.on('limit', () => {
        fileTooLarge = true;
      });
      file.on('error', fail);
    });

    bb.on('close', () => {
      if (settled) return;
      if (fileTooLarge) {
        fail(
          new HttpError(
            413,
            `File exceeds the ${MAX_UPLOAD_SIZE_BYTES}-byte upload limit`,
          ),
        );
        return;
      }
      if (!fileSeen) {
        fail(
          new HttpError(
            400,
            `No file was found in the "${UPLOAD_FIELD_NAME}" form field`,
          ),
        );
        return;
      }

      let frameCount: number;
      try {
        frameCount = counter.finish();
      } catch (err) {
        fail(err);
        return;
      }
      settled = true;
      res.status(200).json({ frameCount });
    });

    bb.on('error', (err) => {
      req.unpipe(bb);
      req.resume();
      fail(err);
    });

    req.pipe(bb);
  },
);
