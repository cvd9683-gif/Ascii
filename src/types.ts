// Type definitions for ASCII Self-Portrait

export interface AsciiSettings {
  // Character set
  charset: string;
  charsetName: CharsetName;

  // Resolution
  width: number; // Number of characters wide

  // Colors
  displayMode: DisplayMode;
  darkColor: string;
  lightColor: string;
  monoColor: string;

  // Typography
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;

  // Options
  invert: boolean;
}

export type CharsetName = 'standard' | 'dense' | 'minimal' | 'blocks' | 'custom';

export type DisplayMode = 'gradient' | 'monochrome' | 'grayscale';

export type InputSource = 'webcam' | 'upload';

export interface ColoredChar {
  char: string;
  color: string;
}

export interface ProcessedFrame {
  width: number;
  height: number;
  chars: ColoredChar[][];
}

export interface CharsetPreset {
  name: string;
  chars: string;
  description: string;
}

export interface ColorPreset {
  name: string;
  dark: string;
  light: string;
}

// Character sets from dark (dense) to light (sparse)
export const CHARSETS: Record<CharsetName, string> = {
  standard: '@#$%&8BMW*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  dense: '@%#*+=-:. ',
  minimal: '@#=-. ',
  blocks: '\u2588\u2593\u2592\u2591 ', // Full block, dark shade, medium shade, light shade, space
  custom: '@#%+=:-. ',
};

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Clinical', dark: '#000000', light: '#ffffff' },
  { name: 'Warm', dark: '#3d2914', light: '#f5e6d3' },
  { name: 'Cool', dark: '#1a2744', light: '#c8d4e3' },
  { name: 'Vintage', dark: '#704214', light: '#f4ecd8' },
  { name: 'Night', dark: '#2d1b4e', light: '#e8dff5' },
  { name: 'Terminal', dark: '#0d3320', light: '#c8f7dc' },
];

export const DEFAULT_SETTINGS: AsciiSettings = {
  charset: CHARSETS.standard,
  charsetName: 'standard',
  width: 80,
  displayMode: 'gradient',
  darkColor: '#1a1a1a',
  lightColor: '#f5f5f5',
  monoColor: '#00ff00',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  lineHeight: 0.95,
  letterSpacing: 0,
  invert: false,
};
