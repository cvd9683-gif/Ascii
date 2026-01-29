// ASCII Self-Portrait - Main Application
// Entry point that orchestrates webcam, image processing, and controls

import './style.css';
import type { AsciiSettings, InputSource } from './types';
import { Controls } from './controls';
import {
  processImageToAscii,
  renderFrameToHtml,
  createProcessingCanvas,
  getVideoFrameData,
  loadImageFile,
} from './ascii-engine';
import {
  requestWebcamAccess,
  stopWebcam,
  isWebcamSupported,
  WebcamError,
  checkCameraPermission,
} from './webcam';

class AsciiPortraitApp {
  // DOM Elements
  private video: HTMLVideoElement;
  private asciiOutput: HTMLPreElement;
  private loadingState: HTMLDivElement;
  private permissionPrompt: HTMLDivElement;
  private errorState: HTMLDivElement;
  private errorMessage: HTMLParagraphElement;
  private enableCameraBtn: HTMLButtonElement;
  private skipCameraBtn: HTMLButtonElement;
  private retryBtn: HTMLButtonElement;
  private originalPreview: HTMLDivElement;
  private originalCanvas: HTMLCanvasElement;
  private originalCtx: CanvasRenderingContext2D;

  // Processing
  private processingCanvas: HTMLCanvasElement;
  private processingCtx: CanvasRenderingContext2D;

  // State
  private stream: MediaStream | null = null;
  private settings: AsciiSettings;
  private inputSource: InputSource = 'webcam';
  private isProcessing = false;
  private animationFrameId: number | null = null;
  private uploadedImageData: ImageData | null = null;
  private lastFrameTime = 0;
  private frameInterval = 1000 / 20; // Target 20 fps
  private controls: Controls;

  constructor() {
    // Get DOM elements
    this.video = document.getElementById('webcam-video') as HTMLVideoElement;
    this.asciiOutput = document.getElementById('ascii-output') as HTMLPreElement;
    this.loadingState = document.getElementById('loading-state') as HTMLDivElement;
    this.permissionPrompt = document.getElementById('permission-prompt') as HTMLDivElement;
    this.errorState = document.getElementById('error-state') as HTMLDivElement;
    this.errorMessage = document.getElementById('error-message') as HTMLParagraphElement;
    this.enableCameraBtn = document.getElementById('enable-camera-btn') as HTMLButtonElement;
    this.skipCameraBtn = document.getElementById('skip-camera-btn') as HTMLButtonElement;
    this.retryBtn = document.getElementById('retry-btn') as HTMLButtonElement;
    this.originalPreview = document.getElementById('original-preview') as HTMLDivElement;
    this.originalCanvas = document.getElementById('original-canvas') as HTMLCanvasElement;

    const origCtx = this.originalCanvas.getContext('2d');
    if (!origCtx) throw new Error('Could not get original canvas context');
    this.originalCtx = origCtx;

    // Create processing canvas
    const { canvas, ctx } = createProcessingCanvas();
    this.processingCanvas = canvas;
    this.processingCtx = ctx;

    // Initialize controls
    this.controls = new Controls(
      (settings) => this.onSettingsChange(settings),
      (source) => this.onInputSourceChange(source),
      (file) => this.onFileSelected(file),
      () => this.downloadImage(),
      (enabled) => this.onSideBySideChange(enabled)
    );

    this.settings = this.controls.getSettings();

    // Bind event handlers
    this.enableCameraBtn.addEventListener('click', () => this.startWebcam());
    this.skipCameraBtn.addEventListener('click', () => this.switchToUpload());
    this.retryBtn.addEventListener('click', () => this.startWebcam());

    // Initialize
    this.init();
  }

  private async init(): Promise<void> {
    // Check if webcam is supported
    if (!isWebcamSupported()) {
      this.switchToUpload();
      return;
    }

    // Check permission status
    const permissionState = await checkCameraPermission();

    if (permissionState === 'granted') {
      // Permission already granted, start webcam
      this.startWebcam();
    } else {
      // Show permission prompt
      this.showPermissionPrompt();
    }
  }

  private showPermissionPrompt(): void {
    this.hideAllStates();
    this.permissionPrompt.classList.remove('hidden');
  }

  private showLoading(): void {
    this.hideAllStates();
    this.loadingState.classList.remove('hidden');
  }

  private showError(message: string): void {
    this.hideAllStates();
    this.errorMessage.textContent = message;
    this.errorState.classList.remove('hidden');
  }

  private hideAllStates(): void {
    this.loadingState.classList.add('hidden');
    this.permissionPrompt.classList.add('hidden');
    this.errorState.classList.add('hidden');
  }

  private async startWebcam(): Promise<void> {
    this.showLoading();

    try {
      this.stream = await requestWebcamAccess(this.video);
      this.hideAllStates();
      this.inputSource = 'webcam';
      this.startProcessingLoop();
    } catch (err) {
      if (err instanceof WebcamError) {
        if (err.type === 'permission-denied') {
          this.showError(err.message);
        } else {
          this.showError(err.message);
        }
      } else {
        this.showError('An unexpected error occurred. Please try again.');
      }
    }
  }

  private switchToUpload(): void {
    this.stopProcessing();
    stopWebcam(this.video, this.stream);
    this.stream = null;
    this.hideAllStates();
    this.inputSource = 'upload';

    // Show placeholder message
    this.asciiOutput.innerHTML = '<span style="color: #666">Upload an image to see it translated to ASCII</span>';
  }

  private onInputSourceChange(source: InputSource): void {
    if (source === 'webcam') {
      this.uploadedImageData = null;
      this.startWebcam();
    } else {
      this.switchToUpload();
    }
  }

  private async onFileSelected(file: File): Promise<void> {
    this.showLoading();

    try {
      this.uploadedImageData = await loadImageFile(
        file,
        this.processingCanvas,
        this.processingCtx
      );
      this.hideAllStates();
      this.processStaticImage();
    } catch {
      this.showError('Failed to load image. Please try a different file.');
    }
  }

  private onSettingsChange(settings: AsciiSettings): void {
    this.settings = settings;

    // If we have a static image, reprocess it
    if (this.inputSource === 'upload' && this.uploadedImageData) {
      this.processStaticImage();
    }
  }

  private onSideBySideChange(enabled: boolean): void {
    this.originalPreview.classList.toggle('hidden', !enabled);

    if (enabled) {
      this.updateOriginalPreview();
    }
  }

  private updateOriginalPreview(): void {
    if (this.inputSource === 'webcam' && this.video.readyState >= 2) {
      const scale = 200 / this.video.videoWidth;
      this.originalCanvas.width = 200;
      this.originalCanvas.height = Math.floor(this.video.videoHeight * scale);
      this.originalCtx.save();
      this.originalCtx.scale(-1, 1);
      this.originalCtx.drawImage(
        this.video,
        -this.originalCanvas.width,
        0,
        this.originalCanvas.width,
        this.originalCanvas.height
      );
      this.originalCtx.restore();
    } else if (this.uploadedImageData) {
      const { width, height } = this.uploadedImageData;
      const scale = 200 / width;
      this.originalCanvas.width = 200;
      this.originalCanvas.height = Math.floor(height * scale);
      this.originalCtx.putImageData(this.uploadedImageData, 0, 0);
      // Scale down
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(this.uploadedImageData, 0, 0);
      this.originalCtx.drawImage(
        tempCanvas,
        0,
        0,
        width,
        height,
        0,
        0,
        this.originalCanvas.width,
        this.originalCanvas.height
      );
    }
  }

  private processStaticImage(): void {
    if (!this.uploadedImageData) return;

    const frame = processImageToAscii(this.uploadedImageData, this.settings);
    const html = renderFrameToHtml(frame);
    this.asciiOutput.innerHTML = html;

    // Update original preview if visible
    if (!this.originalPreview.classList.contains('hidden')) {
      this.updateOriginalPreview();
    }
  }

  private startProcessingLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.isProcessing = true;
    this.processFrame();
  }

  private stopProcessing(): void {
    this.isProcessing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private processFrame = (): void => {
    if (!this.isProcessing) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);

      // Get video frame data
      const imageData = getVideoFrameData(
        this.video,
        this.processingCanvas,
        this.processingCtx
      );

      if (imageData) {
        // Process to ASCII
        const frame = processImageToAscii(imageData, this.settings);
        const html = renderFrameToHtml(frame);
        this.asciiOutput.innerHTML = html;

        // Update original preview if visible
        if (!this.originalPreview.classList.contains('hidden')) {
          this.updateOriginalPreview();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  private downloadImage(): void {
    // Create a canvas to render the ASCII output
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Get computed styles
    const styles = getComputedStyle(this.asciiOutput);
    const fontSize = parseInt(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.2;
    const letterSpacing = parseFloat(styles.letterSpacing) || 0;
    const fontFamily = styles.fontFamily;

    // Get all spans
    const spans = this.asciiOutput.querySelectorAll('span');
    if (spans.length === 0) return;

    // Calculate dimensions
    const lines = this.asciiOutput.innerHTML.split('\n');
    const maxLineLength = Math.max(...lines.map((line) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = line;
      return tempDiv.textContent?.length || 0;
    }));

    // Measure character width
    ctx.font = `${fontSize}px ${fontFamily}`;
    const charWidth = ctx.measureText('M').width + letterSpacing;

    const padding = 40;
    tempCanvas.width = maxLineLength * charWidth + padding * 2;
    tempCanvas.height = lines.length * lineHeight + padding * 2;

    // Fill background
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw text
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';

    let y = padding;
    lines.forEach((line) => {
      // Parse spans in this line
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = line;
      const lineSpans = tempDiv.querySelectorAll('span');

      let x = padding;
      lineSpans.forEach((span) => {
        const color = span.style.color || '#ffffff';
        const char = span.textContent || '';

        ctx.fillStyle = color;
        ctx.fillText(char, x, y);
        x += charWidth;
      });

      y += lineHeight;
    });

    // Download
    const link = document.createElement('a');
    link.download = 'ascii-portrait.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AsciiPortraitApp();
});
