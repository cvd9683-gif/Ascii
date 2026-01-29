// ASCII Translation Engine
// Converts image data to ASCII characters with color mapping

import type { AsciiSettings, ColoredChar, ProcessedFrame } from './types';

/**
 * Convert RGB to grayscale using luminance formula
 * Uses perceptual weights: R=0.299, G=0.587, B=0.114
 */
function rgbToGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolate between two colors based on a factor (0-1)
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = c1.r + (c2.r - c1.r) * factor;
  const g = c1.g + (c2.g - c1.g) * factor;
  const b = c1.b + (c2.b - c1.b) * factor;

  return rgbToHex(r, g, b);
}

/**
 * Map brightness value (0-255) to a character from the charset
 */
function brightnessToChar(brightness: number, charset: string, invert: boolean): string {
  // Normalize brightness to 0-1
  let normalized = brightness / 255;

  // Invert if needed (dark areas become light characters)
  if (invert) {
    normalized = 1 - normalized;
  }

  // Map to character index
  const index = Math.floor(normalized * (charset.length - 1));
  return charset[Math.min(index, charset.length - 1)];
}

/**
 * Get color for a character based on brightness and display mode
 */
function getCharColor(
  brightness: number,
  settings: AsciiSettings
): string {
  const normalized = brightness / 255;

  switch (settings.displayMode) {
    case 'gradient':
      // Interpolate between dark and light colors
      // Dark color for low brightness, light color for high brightness
      return interpolateColor(settings.darkColor, settings.lightColor, normalized);

    case 'monochrome':
      return settings.monoColor;

    case 'grayscale':
      // Use actual grayscale value
      const gray = Math.round(brightness);
      return rgbToHex(gray, gray, gray);

    default:
      return settings.lightColor;
  }
}

/**
 * Process image data and convert to ASCII
 */
export function processImageToAscii(
  imageData: ImageData,
  settings: AsciiSettings
): ProcessedFrame {
  const { width: imgWidth, height: imgHeight, data } = imageData;
  const { charset, width: targetWidth, invert } = settings;

  // Calculate dimensions
  // Characters are typically ~2x taller than wide, so adjust height
  const aspectRatio = imgHeight / imgWidth;
  const charAspectRatio = 0.5; // Approximate character aspect ratio
  const targetHeight = Math.round(targetWidth * aspectRatio * charAspectRatio);

  // Calculate sample size (how many pixels per character)
  const sampleWidth = imgWidth / targetWidth;
  const sampleHeight = imgHeight / targetHeight;

  const result: ColoredChar[][] = [];

  for (let y = 0; y < targetHeight; y++) {
    const row: ColoredChar[] = [];

    for (let x = 0; x < targetWidth; x++) {
      // Sample a region of pixels and average their brightness
      const startX = Math.floor(x * sampleWidth);
      const startY = Math.floor(y * sampleHeight);
      const endX = Math.min(Math.floor((x + 1) * sampleWidth), imgWidth);
      const endY = Math.min(Math.floor((y + 1) * sampleHeight), imgHeight);

      let totalBrightness = 0;
      let pixelCount = 0;

      for (let py = startY; py < endY; py++) {
        for (let px = startX; px < endX; px++) {
          const idx = (py * imgWidth + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          totalBrightness += rgbToGray(r, g, b);
          pixelCount++;
        }
      }

      const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
      const char = brightnessToChar(avgBrightness, charset, invert);
      const color = getCharColor(avgBrightness, settings);

      row.push({ char, color });
    }

    result.push(row);
  }

  return {
    width: targetWidth,
    height: targetHeight,
    chars: result,
  };
}

/**
 * Render processed frame to HTML string
 */
export function renderFrameToHtml(frame: ProcessedFrame): string {
  return frame.chars
    .map((row) =>
      row
        .map((cell) => `<span style="color:${cell.color}">${escapeHtml(cell.char)}</span>`)
        .join('')
    )
    .join('\n');
}

/**
 * Render processed frame to plain text
 */
export function renderFrameToText(frame: ProcessedFrame): string {
  return frame.chars.map((row) => row.map((cell) => cell.char).join('')).join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

/**
 * Create a canvas context for image processing
 */
export function createProcessingCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }
  return { canvas, ctx };
}

/**
 * Draw video frame to canvas and get image data
 */
export function getVideoFrameData(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxWidth: number = 640
): ImageData | null {
  if (video.readyState < 2) {
    return null;
  }

  // Scale down for performance
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.floor(video.videoWidth * scale);
  const height = Math.floor(video.videoHeight * scale);

  canvas.width = width;
  canvas.height = height;

  // Mirror the video horizontally (selfie mode)
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -width, 0, width, height);
  ctx.restore();

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Load image from file and get image data
 */
export function loadImageFile(
  file: File,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxWidth: number = 640
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down for performance
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.floor(img.width * scale);
      const height = Math.floor(img.height * scale);

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(ctx.getImageData(0, 0, width, height));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
