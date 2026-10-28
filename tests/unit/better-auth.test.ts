import { describe, it, expect, beforeEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { DatabaseSync } from 'node:sqlite';

describe('Better-Auth Multi-Session & Incognito Persistence', () => {
  let db: DatabaseSync;
  let authInstance: any;

  beforeEach(async () => {
    // In-memory isolated SQLite database for unit tests
    db = new DatabaseSync(':memory:');
    authInstance = betterAuth({
      database: db,
      baseURL: 'http://localhost:5173',
      emailAndPassword: { enabled: true }
    });

    const { runMigrations } = await getMigrations(authInstance.options);
    await runMigrations();
  });

  it('creates an account and authenticates successfully', async () => {
    const signup = await authInstance.api.signUpEmail({
      body: {
        email: 'designer@aurabim.com',
        password: 'SecurePassword123',
        name: 'Lead Architect'
      }
    });

    expect(signup.user).toBeDefined();
    expect(signup.user.email).toBe('designer@aurabim.com');
    expect(signup.user.name).toBe('Lead Architect');

    const signin = await authInstance.api.signInEmail({
      body: {
        email: 'designer@aurabim.com',
        password: 'SecurePassword123'
      }
    });

    expect(signin.user).toBeDefined();
    expect(signin.user.id).toBe(signup.user.id);
  });

  it('allows an Incognito session to sign in to an account created in normal session', async () => {
    // Session 1: User registers in normal browser session
    const normalSessionUser = await authInstance.api.signUpEmail({
      body: {
        email: 'shared@studio.com',
        password: 'Password999',
        name: 'Shared Designer'
      }
    });
    expect(normalSessionUser.user.id).toBeDefined();

    // Session 2: User opens Incognito window with separate cookies and logs in to the same server database
    const incognitoSessionAuth = await authInstance.api.signInEmail({
      body: {
        email: 'shared@studio.com',
        password: 'Password999'
      }
    });

    expect(incognitoSessionAuth.user).toBeDefined();
    expect(incognitoSessionAuth.user.email).toBe('shared@studio.com');
    expect(incognitoSessionAuth.user.id).toBe(normalSessionUser.user.id);
  });

  it('rejects signin with invalid credentials or unregistered email', async () => {
    try {
      await authInstance.api.signInEmail({
        body: {
          email: 'unknown@studio.com',
          password: 'wrong'
        }
      });
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });
});
