import { cloudinary } from "../config/cloudinary";
import { AppError } from "./app-error";

export type CloudFolder = "civil-works-evidence" | "civil-works-expense-support";

/**
 * Uploads a buffer to Cloudinary and returns its HTTPS URL.
 * resource_type "auto" lets the same helper store images and PDFs.
 */
export function uploadBuffer(buffer: Buffer, folder: CloudFolder): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (error, result) => {
      if (error || !result) return reject(new AppError(502, "File storage is unavailable"));
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}
