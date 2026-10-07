"use server";

import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { ADMIN_MESSAGES, type AdminActionResult } from "@/lib/adminActionResult";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image to Cloudinary (admin only).
 *
 * This server action:
 * - Requires admin authorization
 * - Validates file type and size
 * - Uploads to Cloudinary using signed upload
 * - Returns the secure URL
 *
 * Supported formats: jpg, jpeg, png, webp
 * Max size: 5MB
 */
export async function uploadProductImage(
  file: File
): Promise<AdminActionResult<{ url: string; publicId: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      status: 400,
      error: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
    };
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      success: false,
      status: 400,
      error: "File too large. Maximum size is 5MB.",
    };
  }

  try {
    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with folder structure
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: "products",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            max_file_size: maxSize,
            transformation: [
              { quality: "auto", fetch_format: "auto" },
              { width: 1200, height: 1200, crop: "limit" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Upload failed"));
          }
        ).end(buffer);
      }
    );

    return {
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      status: 500,
      error: ADMIN_MESSAGES.failed,
    };
  }
}

/**
 * Delete an image from Cloudinary (admin only).
 *
 * Use this when replacing an image to avoid orphaned assets.
 */
export async function deleteProductImage(
  publicId: string
): Promise<AdminActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting image:", error);
    // Don't fail the operation if deletion fails - the product update is more important
    return { success: true, data: undefined };
  }
}
