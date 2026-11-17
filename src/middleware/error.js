import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/helpers.js';
import { env } from '../config/env.js';

export const notFound = (req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });

const PG = { '23505': [409, 'Already exists'], '23503': [400, 'Referenced record does not exist'], '22P02': [400, 'Invalid input format'], '23514': [400, 'Value violates a constraint'] };

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError)
    return res.status(400).json({ error: 'Validation failed', details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })) });
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err?.code && PG[err.code]) return res.status(PG[err.code][0]).json({ error: PG[err.code][1] });
  if (err?.statusCode && err?.error) return res.status(400).json({ error: err.error.description || 'Payment provider error' });
  console.error(err);
  res.status(500).json({ error: env.isProd ? 'Internal server error' : err.message });
};
