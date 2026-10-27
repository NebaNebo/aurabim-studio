import { describe, it, expect } from 'vitest';
import { sha1Hex } from '../../src/services/cloudinary-service';

describe('Cloudinary Service Authentication & Signing', () => {
  it('computes accurate SHA-1 hex digest matching cryptographic standard', async () => {
    // Standard test vector: SHA-1 of empty string
    const emptyHash = await sha1Hex('');
    expect(emptyHash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');

    // Standard test vector: SHA-1 of "test"
    const testHash = await sha1Hex('test');
    expect(testHash).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3');
  });

  it('generates consistent Cloudinary parameter signatures', async () => {
    const timestamp = '1700000000';
    const folder = 'aurabim_projects';
    const apiSecret = 'test_secret_123';
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

    const sig = await sha1Hex(stringToSign);
    expect(sig.length).toBe(40);
    expect(/^[0-9a-f]{40}$/.test(sig)).toBe(true);
  });
});
