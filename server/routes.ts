import { put } from "@vercel/blob";
import multer from "multer";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
// ... other existing imports and helpers remain in the full file ...

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

/** Upload a file to Vercel Blob. Returns public URL or null if token missing / no file. */
async function uploadToBlob(file: Express.Multer.File | undefined, prefix: string): Promise<string | null> {
  if (!file) return null;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn(`[blob] BLOB_READ_WRITE_TOKEN is missing — photo upload skipped for ${prefix}/${file.originalname}`);
    return null;
  }
  try {
    const blob = await put(`${prefix}/${Date.now()}-${file.originalname}`, file.buffer, {
      access: "public",
      contentType: file.mimetype,
      token,
    });
    return blob.url;
  } catch (err) {
    console.error("[blob] upload failed:", err);
    return null;
  }
}

// In POST /api/delays (after building the delay object):
//   const photoUrl = await uploadToBlob(req.file, "delays");
//   photoPath: photoUrl,

// In POST /api/birthdays and PATCH /api/birthdays/:id:
//   const photoUrl = await uploadToBlob(req.file, "birthdays");
//   if (photoUrl) patch.photoPath = photoUrl;

export async function registerRoutes(/* ... existing signature ... */) {
  // existing route registrations ...
  // replace the photoPath: null / "" lines with the uploadToBlob calls above
}
