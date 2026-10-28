import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dbDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'aurabim-auth.sqlite');
const db = new DatabaseSync(dbPath);

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173'
  ],
  secret: process.env.BETTER_AUTH_SECRET || 'aurabim_better_auth_studio_secure_dev_secret_2026',
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  }
});

let isMigrated = false;
export async function ensureAuthDatabase() {
  if (isMigrated) return;
  try {
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
    isMigrated = true;
  } catch (err) {
    console.warn('[Better-Auth] Migration note:', err);
  }
}
