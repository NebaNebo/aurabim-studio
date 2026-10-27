/**
 * Cloudinary Object Storage Service
 * Provides direct SHA-1 signed uploads from browser to Cloudinary CDN
 * for CAD 2D / 3D canvas snapshots and blueprint underlay assets.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'uyd1vcng';
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '883355689929588';
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'iiLiTOiTCUA4cLCPIBfCiUNyioQ';

/**
 * Computes SHA-1 hash hex string using native Web Crypto API
 */
export async function sha1Hex(message: string): Promise<string> {
  const enc = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Uploads a base64 Data URL or Blob directly to Cloudinary using signed authentication
 */
export async function uploadToCloudinary(
  fileData: string | Blob,
  folder: string = 'aurabim_projects',
  publicId?: string
): Promise<CloudinaryUploadResult> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Sort parameters alphabetically to construct standard Cloudinary signature string
  const paramsToSign: Record<string, string> = {
    folder,
    timestamp
  };
  if (publicId) {
    paramsToSign.public_id = publicId;
  }

  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&');
  const stringToSign = `${serialized}${API_SECRET}`;

  const signature = await sha1Hex(stringToSign);

  const formData = new FormData();
  formData.append('file', fileData);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('folder', folder);
  if (publicId) {
    formData.append('public_id', publicId);
  }
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Cloudinary upload warning:', errText);
      throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return {
      secureUrl: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format
    };
  } catch (err) {
    console.warn('Direct Cloudinary upload error:', err);
    // If string data URL, return it as fallback so saving is non-blocking
    if (typeof fileData === 'string') {
      return {
        secureUrl: fileData,
        publicId: `fallback_${Date.now()}`,
        width: 480,
        height: 320,
        format: 'jpg'
      };
    }
    throw err;
  }
}

/**
 * Captures a clean thumbnail image from an active canvas (2D CAD or 3D WebGL)
 * and uploads it to Cloudinary.
 */
export async function captureAndUploadCanvasThumbnail(
  canvas: HTMLCanvasElement,
  projectId: string
): Promise<string> {
  // Downscale to 480x300 for crisp thumbnail performance
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 480;
  thumbCanvas.height = 300;
  const ctx = thumbCanvas.getContext('2d');

  if (ctx) {
    // Fill subtle architectural background
    ctx.fillStyle = '#f4f4f2';
    ctx.fillRect(0, 0, 480, 300);

    // Draw source canvas maintaining aspect ratio
    const srcW = canvas.width;
    const srcH = canvas.height;
    if (srcW > 0 && srcH > 0) {
      const scale = Math.min(480 / srcW, 300 / srcH);
      const dw = srcW * scale;
      const dh = srcH * scale;
      const dx = (480 - dw) / 2;
      const dy = (300 - dh) / 2;
      ctx.drawImage(canvas, dx, dy, dw, dh);
    }
  }

  const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);
  const cleanProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const result = await uploadToCloudinary(dataUrl, 'aurabim_projects', `thumb_${cleanProjectId}`);
  return result.secureUrl;
}
