import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from './helpers.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, 'Only PNG, JPG, WEBP or GIF images are allowed')),
});

export async function uploadImage(bucket, folder, file) {
  if (!file) throw new ApiError(400, 'No file uploaded (field name: "file")');
  const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });
  if (error) throw new ApiError(500, `Upload failed: ${error.message}`);
  return supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
