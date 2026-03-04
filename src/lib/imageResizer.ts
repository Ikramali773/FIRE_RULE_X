// src/lib/imageResizer.ts
// Resize images before sending to AI to reduce token usage.
// Caps at MAX_DIMENSION while preserving aspect ratio and quality.

import sharp from 'sharp';

const MAX_DIMENSION = 1536; // Gemini recommended max for detailed understanding

/**
 * Resize an image buffer to fit within MAX_DIMENSION, preserving aspect ratio.
 * Returns the resized buffer. If already small enough, returns the original.
 */
export async function resizeForAI(imageBuffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;

    // If image is already small enough, return as-is
    if (width && height && width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        return imageBuffer;
    }

    const resized = await sharp(imageBuffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
            fit: 'inside',         // Preserve aspect ratio, fit within box
            withoutEnlargement: true,
        })
        .png({ quality: 85 })     // Keep PNG format, good quality
        .toBuffer();

    return resized;
}
