/**
 * AuraBIM Studio — Cloud Authentication Registry
 * Provides cross-device account synchronization backed by Cloudinary Object Storage.
 * Ensures accounts created on one device (e.g. desktop) are immediately accessible
 * on any other device (e.g. mobile, tablet, incognito, other browsers).
 */

import type { RegisteredUserRecord } from './auth-helpers';

const CLOUD_NAME = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'uyd1vcng';
const API_KEY = (import.meta as any).env?.VITE_CLOUDINARY_API_KEY || '883355689929588';
const API_SECRET = (import.meta as any).env?.VITE_CLOUDINARY_API_SECRET || 'iiLiTOiTCUA4cLCPIBfCiUNyioQ';
export const REGISTRY_PUBLIC_ID = 'aurabim_users_registry';

/**
 * Computes SHA-1 hash for Cloudinary signed requests
 */
async function computeSha1(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', enc);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback for environments where crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = ((hash << 5) - hash) + message.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(40, '0');
}

/**
 * Fetches the global registered user registry from Cloudinary
 */
export async function fetchCloudUserRegistry(): Promise<Record<string, RegisteredUserRecord>> {
  if (typeof fetch === 'undefined') return {};
  try {
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${REGISTRY_PUBLIC_ID}?cb=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return {};
    }
    const data = await res.json();
    if (data && typeof data === 'object') {
      return data as Record<string, RegisteredUserRecord>;
    }
    return {};
  } catch (err) {
    // Non-blocking: network offline or ad-blocker
    return {};
  }
}

/**
 * Uploads an updated user registry to Cloudinary
 */
export async function uploadCloudUserRegistry(
  users: Record<string, RegisteredUserRecord>
): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const overwrite = 'true';
    const stringToSign = `overwrite=${overwrite}&public_id=${REGISTRY_PUBLIC_ID}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await computeSha1(stringToSign);

    const jsonString = JSON.stringify(users);
    const base64Data = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonString)))
      : Buffer.from(jsonString).toString('base64');

    const form = new FormData();
    form.append('file', `data:application/json;base64,${base64Data}`);
    form.append('api_key', API_KEY);
    form.append('timestamp', timestamp);
    form.append('public_id', REGISTRY_PUBLIC_ID);
    form.append('overwrite', overwrite);
    form.append('signature', signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
    const res = await fetch(endpoint, {
      method: 'POST',
      body: form
    });

    return res.ok;
  } catch (err) {
    console.warn('[Cloud Registry] Sync upload error (will retry next save):', err);
    return false;
  }
}

/**
 * Merges two user registries, preserving the newest data per email
 */
export function mergeRegistries(
  localUsers: Record<string, RegisteredUserRecord>,
  cloudUsers: Record<string, RegisteredUserRecord>
): { merged: Record<string, RegisteredUserRecord>; hasNewLocal: boolean } {
  const merged: Record<string, RegisteredUserRecord> = { ...cloudUsers };
  let hasNewLocal = false;

  for (const [email, record] of Object.entries(localUsers)) {
    const lower = email.toLowerCase();
    if (!merged[lower] || (record.createdAt > (merged[lower].createdAt || 0))) {
      merged[lower] = record;
      hasNewLocal = true;
    }
  }

  return { merged, hasNewLocal };
}
