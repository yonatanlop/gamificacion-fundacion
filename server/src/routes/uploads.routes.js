import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();

const ALLOWED = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => cb(null, `${randomUUID()}${ALLOWED[file.mimetype] || ''}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new HttpError(415, 'Formato no permitido (usa PNG, JPG, WEBP, GIF o SVG)'));
    }
    return cb(null, true);
  },
});

router.post(
  '/',
  requireAuth,
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(413, 'El archivo supera el tamaño máximo permitido'));
      }
      return next(err);
    }),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No se recibió ningún archivo');
    const rel = `/uploads/${path.basename(req.file.filename)}`;
    res.status(201).json({ url: rel, size: req.file.size, mimetype: req.file.mimetype });
  }),
);

export default router;
