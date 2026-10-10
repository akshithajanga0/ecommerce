"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { adminSupabase } from "@/lib/supabase/admin";
import { ADMIN_MESSAGES, type AdminActionResult } from "@/lib/adminActionResult";

const BUCKET_NAME = "product-images";

/**
 * Ensures the public product-images bucket exists.
 */
async function ensureBucketExists(): Promise<void> {
  const { data: bucket } = await adminSupabase.storage.getBucket(BUCKET_NAME);
  if (!bucket) {
    await adminSupabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    });
  }
}

/**
 * Upload a product image to Supabase Storage (admin only).
 *
 * Supported formats: jpg, jpeg, png, webp
 * Max size: 5MB
 */
export async function uploadProductImage(
  input: FormData | File
): Promise<AdminActionResult<{ url: string; publicId: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  let file: File;
  if (input instanceof FormData) {
    const f = input.get("file");
    if (!f || !(f instanceof File)) {
      return {
        success: false,
        status: 400,
        error: "No image file provided.",
      };
    }
    file = f;
  } else if (input instanceof File) {
    file = input;
  } else {
    return {
      success: false,
      status: 400,
      error: "Invalid upload payload.",
    };
  }

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
    await ensureBucketExists();

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine clean file extension
    const ext = file.name ? file.name.split(".").pop()?.toLowerCase() || "jpg" : "jpg";
    const cleanExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${cleanExt}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await adminSupabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || `image/${cleanExt === "jpg" ? "jpeg" : cleanExt}`,
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage upload error:", error);
      return {
        success: false,
        status: 500,
        error: error.message || ADMIN_MESSAGES.failed,
      };
    }

    const { data: urlData } = adminSupabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        publicId: data.path,
      },
    };
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      status: 500,
      error: error?.message || ADMIN_MESSAGES.failed,
    };
  }
}

/**
 * Delete an image from Supabase Storage (admin only).
 */
export async function deleteProductImage(
  publicId: string
): Promise<AdminActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  try {
    await adminSupabase.storage.from(BUCKET_NAME).remove([publicId]);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting image:", error);
    return { success: true, data: undefined };
  }
}
