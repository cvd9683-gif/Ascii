// Controls module
// Manages UI controls and settings

import type { AsciiSettings, CharsetName, DisplayMode, InputSource } from './types';
import { CHARSETS, DEFAULT_SETTINGS } from './types';

export type SettingsChangeCallback = (settings: AsciiSettings) => void;
export type InputSourceChangeCallback = (source: InputSource) => void;
export type FileSelectedCallback = (file: File) => void;
export type DownloadCallback = () => void;
export type SideBySideCallback = (enabled: boolean) => void;

interface ControlElements {
  // Input source
  webcamBtn: HTMLButtonElement;
  uploadBtn: HTMLButtonElement;
  uploadZone: HTMLDivElement;
  fileInput: HTMLInputElement;
  browseBtn: HTMLButtonElement;

  // Character set
  charsetSelect: HTMLSelectElement;
  customCharsetInput: HTMLDivElement;
  customChars: HTMLInputElement;

  // Resolution
  resolutionSlider: HTMLInputElement;
  resolutionValue: HTMLSpanElement;

  // Display mode
  modeBtns: NodeListOf<HTMLButtonElement>;

  // Color pickers
  colorPickers: HTMLDivElement;
  darkColor: HTMLInputElement;
  darkColorHex: HTMLInputElement;
  lightColor: HTMLInputElement;
  lightColorHex: HTMLInputElement;
  monoColorPicker: HTMLDivElement;
  monoColor: HTMLInputElement;
  monoColorHex: HTMLInputElement;
  gradientPreview: HTMLDivElement;

  // Color presets
  presetBtns: NodeListOf<HTMLButtonElement>;

  // Typography
  fontSelect: HTMLSelectElement;
  fontSizeSlider: HTMLInputElement;
  fontSizeValue: HTMLSpanElement;
  lineHeightSlider: HTMLInputElement;
  lineHeightValue: HTMLSpanElement;
  letterSpacingSlider: HTMLInputElement;
  letterSpacingValue: HTMLSpanElement;

  // Toggles
  invertToggle: HTMLInputElement;
  sideBySideToggle: HTMLInputElement;

  // Actions
  downloadBtn: HTMLButtonElement;

  // ASCII output
  asciiOutput: HTMLPreElement;
}

export class Controls {
  private elements: ControlElements;
  private settings: AsciiSettings;
  private onSettingsChange: SettingsChangeCallback;
  private onInputSourceChange: InputSourceChangeCallback;
  private onFileSelected: FileSelectedCallback;
  private onDownload: DownloadCallback;
  private onSideBySideChange: SideBySideCallback;

  constructor(
    onSettingsChange: SettingsChangeCallback,
    onInputSourceChange: InputSourceChangeCallback,
    onFileSelected: FileSelectedCallback,
    onDownload: DownloadCallback,
    onSideBySideChange: SideBySideCallback
  ) {
    this.settings = { ...DEFAULT_SETTINGS };
    this.onSettingsChange = onSettingsChange;
    this.onInputSourceChange = onInputSourceChange;
    this.onFileSelected = onFileSelected;
    this.onDownload = onDownload;
    this.onSideBySideChange = onSideBySideChange;

    this.elements = this.getElements();
    this.bindEvents();
    this.updateUI();
  }

  private getElements(): ControlElements {
    return {
      // Input source
      webcamBtn: document.getElementById('webcam-btn') as HTMLButtonElement,
      uploadBtn: document.getElementById('upload-btn') as HTMLButtonElement,
      uploadZone: document.getElementById('upload-zone') as HTMLDivElement,
      fileInput: document.getElementById('file-input') as HTMLInputElement,
      browseBtn: document.getElementById('browse-btn') as HTMLButtonElement,

      // Character set
      charsetSelect: document.getElementById('charset-select') as HTMLSelectElement,
      customCharsetInput: document.getElementById('custom-charset-input') as HTMLDivElement,
      customChars: document.getElementById('custom-chars') as HTMLInputElement,

      // Resolution
      resolutionSlider: document.getElementById('resolution-slider') as HTMLInputElement,
      resolutionValue: document.getElementById('resolution-value') as HTMLSpanElement,

      // Display mode
      modeBtns: document.querySelectorAll('.mode-btn') as NodeListOf<HTMLButtonElement>,

      // Color pickers
      colorPickers: document.getElementById('color-pickers') as HTMLDivElement,
      darkColor: document.getElementById('dark-color') as HTMLInputElement,
      darkColorHex: document.getElementById('dark-color-hex') as HTMLInputElement,
      lightColor: document.getElementById('light-color') as HTMLInputElement,
      lightColorHex: document.getElementById('light-color-hex') as HTMLInputElement,
      monoColorPicker: document.getElementById('mono-color-picker') as HTMLDivElement,
      monoColor: document.getElementById('mono-color') as HTMLInputElement,
      monoColorHex: document.getElementById('mono-color-hex') as HTMLInputElement,
      gradientPreview: document.getElementById('gradient-preview') as HTMLDivElement,

      // Color presets
      presetBtns: document.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>,

      // Typography
      fontSelect: document.getElementById('font-select') as HTMLSelectElement,
      fontSizeSlider: document.getElementById('font-size-slider') as HTMLInputElement,
      fontSizeValue: document.getElementById('font-size-value') as HTMLSpanElement,
      lineHeightSlider: document.getElementById('line-height-slider') as HTMLInputElement,
      lineHeightValue: document.getElementById('line-height-value') as HTMLSpanElement,
      letterSpacingSlider: document.getElementById('letter-spacing-slider') as HTMLInputElement,
      letterSpacingValue: document.getElementById('letter-spacing-value') as HTMLSpanElement,

      // Toggles
      invertToggle: document.getElementById('invert-toggle') as HTMLInputElement,
      sideBySideToggle: document.getElementById('side-by-side-toggle') as HTMLInputElement,

      // Actions
      downloadBtn: document.getElementById('download-btn') as HTMLButtonElement,

      // ASCII output
      asciiOutput: document.getElementById('ascii-output') as HTMLPreElement,
    };
  }

  private bindEvents(): void {
    const { elements } = this;

    // Input source toggle
    elements.webcamBtn.addEventListener('click', () => this.setInputSource('webcam'));
    elements.uploadBtn.addEventListener('click', () => this.setInputSource('upload'));

    // File upload
    elements.browseBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', () => {
      const file = elements.fileInput.files?.[0];
      if (file) {
        this.onFileSelected(file);
      }
    });

    // Drag and drop
    elements.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.uploadZone.classList.add('drag-over');
    });

    elements.uploadZone.addEventListener('dragleave', () => {
      elements.uploadZone.classList.remove('drag-over');
    });

    elements.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        this.onFileSelected(file);
      }
    });

    // Character set
    elements.charsetSelect.addEventListener('change', () => {
      const value = elements.charsetSelect.value as CharsetName;
      this.setCharset(value);
    });

    elements.customChars.addEventListener('input', () => {
      if (this.settings.charsetName === 'custom') {
        this.settings.charset = elements.customChars.value || CHARSETS.custom;
        this.emitChange();
      }
    });

    // Resolution
    elements.resolutionSlider.addEventListener('input', () => {
      this.settings.width = parseInt(elements.resolutionSlider.value, 10);
      elements.resolutionValue.textContent = `${this.settings.width} chars`;
      this.emitChange();
    });

    // Display mode
    elements.modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as DisplayMode;
        this.setDisplayMode(mode);
      });
    });

    // Color pickers
    elements.darkColor.addEventListener('input', () => {
      this.settings.darkColor = elements.darkColor.value;
      elements.darkColorHex.value = elements.darkColor.value;
      this.updateGradientPreview();
      this.emitChange();
    });

    elements.darkColorHex.addEventListener('change', () => {
      const hex = this.validateHex(elements.darkColorHex.value);
      if (hex) {
        this.settings.darkColor = hex;
        elements.darkColor.value = hex;
        elements.darkColorHex.value = hex;
        this.updateGradientPreview();
        this.emitChange();
      }
    });

    elements.lightColor.addEventListener('input', () => {
      this.settings.lightColor = elements.lightColor.value;
      elements.lightColorHex.value = elements.lightColor.value;
      this.updateGradientPreview();
      this.emitChange();
    });

    elements.lightColorHex.addEventListener('change', () => {
      const hex = this.validateHex(elements.lightColorHex.value);
      if (hex) {
        this.settings.lightColor = hex;
        elements.lightColor.value = hex;
        elements.lightColorHex.value = hex;
        this.updateGradientPreview();
        this.emitChange();
      }
    });

    elements.monoColor.addEventListener('input', () => {
      this.settings.monoColor = elements.monoColor.value;
      elements.monoColorHex.value = elements.monoColor.value;
      this.emitChange();
    });

    elements.monoColorHex.addEventListener('change', () => {
      const hex = this.validateHex(elements.monoColorHex.value);
      if (hex) {
        this.settings.monoColor = hex;
        elements.monoColor.value = hex;
        elements.monoColorHex.value = hex;
        this.emitChange();
      }
    });

    // Color presets
    elements.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dark = btn.dataset.dark;
        const light = btn.dataset.light;
        if (dark && light) {
          this.setColorPreset(dark, light);
        }
      });
    });

    // Typography
    elements.fontSelect.addEventListener('change', () => {
      this.settings.fontFamily = elements.fontSelect.value;
      this.updateTypography();
      this.emitChange();
    });

    elements.fontSizeSlider.addEventListener('input', () => {
      this.settings.fontSize = parseInt(elements.fontSizeSlider.value, 10);
      elements.fontSizeValue.textContent = `${this.settings.fontSize}px`;
      this.updateTypography();
      this.emitChange();
    });

    elements.lineHeightSlider.addEventListener('input', () => {
      this.settings.lineHeight = parseFloat(elements.lineHeightSlider.value);
      elements.lineHeightValue.textContent = this.settings.lineHeight.toFixed(2);
      this.updateTypography();
      this.emitChange();
    });

    elements.letterSpacingSlider.addEventListener('input', () => {
      this.settings.letterSpacing = parseFloat(elements.letterSpacingSlider.value);
      elements.letterSpacingValue.textContent = `${this.settings.letterSpacing}px`;
      this.updateTypography();
      this.emitChange();
    });

    // Toggles
    elements.invertToggle.addEventListener('change', () => {
      this.settings.invert = elements.invertToggle.checked;
      this.emitChange();
    });

    elements.sideBySideToggle.addEventListener('change', () => {
      this.onSideBySideChange(elements.sideBySideToggle.checked);
    });

    // Download
    elements.downloadBtn.addEventListener('click', () => this.onDownload());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Spacebar to toggle webcam (when not in input)
      if (e.code === 'Space' && !this.isInputFocused()) {
        e.preventDefault();
        const currentSource = elements.webcamBtn.classList.contains('input-toggle__btn--active')
          ? 'webcam'
          : 'upload';
        this.setInputSource(currentSource === 'webcam' ? 'upload' : 'webcam');
      }
    });
  }

  private isInputFocused(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement ||
      active instanceof HTMLSelectElement ||
      active instanceof HTMLTextAreaElement;
  }

  private setInputSource(source: InputSource): void {
    const { elements } = this;

    // Update button states
    elements.webcamBtn.classList.toggle('input-toggle__btn--active', source === 'webcam');
    elements.uploadBtn.classList.toggle('input-toggle__btn--active', source === 'upload');
    elements.webcamBtn.setAttribute('aria-checked', String(source === 'webcam'));
    elements.uploadBtn.setAttribute('aria-checked', String(source === 'upload'));

    // Show/hide upload zone
    elements.uploadZone.classList.toggle('hidden', source !== 'upload');

    this.onInputSourceChange(source);
  }

  private setCharset(name: CharsetName): void {
    this.settings.charsetName = name;

    if (name === 'custom') {
      this.settings.charset = this.elements.customChars.value || CHARSETS.custom;
      this.elements.customCharsetInput.classList.remove('hidden');
    } else {
      this.settings.charset = CHARSETS[name];
      this.elements.customCharsetInput.classList.add('hidden');
    }

    this.emitChange();
  }

  private setDisplayMode(mode: DisplayMode): void {
    this.settings.displayMode = mode;

    // Update button states
    this.elements.modeBtns.forEach((btn) => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('mode-btn--active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    // Show/hide color pickers based on mode
    const colorPickerRow = this.elements.colorPickers.querySelector('.color-picker-row') as HTMLElement;
    const presets = this.elements.colorPickers.closest('.control-group')?.querySelector('.color-presets') as HTMLElement;

    if (mode === 'gradient') {
      colorPickerRow?.classList.remove('hidden');
      this.elements.monoColorPicker.classList.add('hidden');
      presets?.classList.remove('hidden');
    } else if (mode === 'monochrome') {
      colorPickerRow?.classList.add('hidden');
      this.elements.monoColorPicker.classList.remove('hidden');
      presets?.classList.add('hidden');
    } else {
      // Grayscale
      colorPickerRow?.classList.add('hidden');
      this.elements.monoColorPicker.classList.add('hidden');
      presets?.classList.add('hidden');
    }

    this.emitChange();
  }

  private setColorPreset(dark: string, light: string): void {
    this.settings.darkColor = dark;
    this.settings.lightColor = light;

    this.elements.darkColor.value = dark;
    this.elements.darkColorHex.value = dark;
    this.elements.lightColor.value = light;
    this.elements.lightColorHex.value = light;

    this.updateGradientPreview();
    this.emitChange();
  }

  private updateGradientPreview(): void {
    this.elements.gradientPreview.style.setProperty('--gradient-dark', this.settings.darkColor);
    this.elements.gradientPreview.style.setProperty('--gradient-light', this.settings.lightColor);
  }

  private updateTypography(): void {
    const { asciiOutput } = this.elements;
    asciiOutput.style.fontFamily = this.settings.fontFamily;
    asciiOutput.style.fontSize = `${this.settings.fontSize}px`;
    asciiOutput.style.lineHeight = String(this.settings.lineHeight);
    asciiOutput.style.letterSpacing = `${this.settings.letterSpacing}px`;
  }

  private validateHex(value: string): string | null {
    const hex = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      return hex;
    }
    return null;
  }

  private updateUI(): void {
    const { elements, settings } = this;

    // Resolution
    elements.resolutionSlider.value = String(settings.width);
    elements.resolutionValue.textContent = `${settings.width} chars`;

    // Colors
    elements.darkColor.value = settings.darkColor;
    elements.darkColorHex.value = settings.darkColor;
    elements.lightColor.value = settings.lightColor;
    elements.lightColorHex.value = settings.lightColor;
    elements.monoColor.value = settings.monoColor;
    elements.monoColorHex.value = settings.monoColor;
    this.updateGradientPreview();

    // Typography
    elements.fontSizeSlider.value = String(settings.fontSize);
    elements.fontSizeValue.textContent = `${settings.fontSize}px`;
    elements.lineHeightSlider.value = String(settings.lineHeight);
    elements.lineHeightValue.textContent = settings.lineHeight.toFixed(2);
    elements.letterSpacingSlider.value = String(settings.letterSpacing);
    elements.letterSpacingValue.textContent = `${settings.letterSpacing}px`;

    // Apply typography to output
    this.updateTypography();
  }

  private emitChange(): void {
    this.onSettingsChange({ ...this.settings });
  }

  public getSettings(): AsciiSettings {
    return { ...this.settings };
  }

  public getAsciiOutput(): HTMLPreElement {
    return this.elements.asciiOutput;
  }
}
