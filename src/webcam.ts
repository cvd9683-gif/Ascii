// Webcam handling module
// Manages camera access and video stream

export interface WebcamState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
}

export type WebcamErrorType = 'permission-denied' | 'not-found' | 'not-supported' | 'unknown';

/**
 * Check if webcam API is supported
 */
export function isWebcamSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Request webcam access
 */
export async function requestWebcamAccess(
  video: HTMLVideoElement
): Promise<MediaStream> {
  if (!isWebcamSupported()) {
    throw new WebcamError('not-supported', 'Camera access is not supported in this browser');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user', // Front camera for selfies
      },
      audio: false,
    });

    video.srcObject = stream;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play()
          .then(() => resolve())
          .catch(reject);
      };
      video.onerror = () => reject(new Error('Video element error'));
    });

    return stream;
  } catch (err) {
    const error = err as Error;

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new WebcamError('permission-denied', 'Camera access was denied. Please allow camera access in your browser settings.');
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new WebcamError('not-found', 'No camera found. Please connect a camera and try again.');
    }

    throw new WebcamError('unknown', `Camera error: ${error.message}`);
  }
}

/**
 * Stop webcam stream
 */
export function stopWebcam(video: HTMLVideoElement, stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  video.srcObject = null;
}

/**
 * Custom error class for webcam errors
 */
export class WebcamError extends Error {
  type: WebcamErrorType;

  constructor(type: WebcamErrorType, message: string) {
    super(message);
    this.name = 'WebcamError';
    this.type = type;
  }
}

/**
 * Check if camera permission was previously granted
 */
export async function checkCameraPermission(): Promise<PermissionState | null> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    }
  } catch {
    // Permission API not supported or camera not recognized
  }
  return null;
}
