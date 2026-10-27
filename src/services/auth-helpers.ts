export interface RegisteredUserRecord {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

export const LOCAL_USER_KEY = 'aurabim_auth_user';
export const REGISTERED_USERS_KEY = 'aurabim_registered_users';

export function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

export function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export function removeLocalItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

export async function computePasswordHash(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash) + password.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function getRegisteredUsers(): Record<string, RegisteredUserRecord> {
  const raw = getLocalItem(REGISTERED_USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveRegisteredUser(record: RegisteredUserRecord): void {
  const users = getRegisteredUsers();
  users[record.email.toLowerCase()] = record;
  setLocalItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export async function seedDefaultAccountIfEmpty(): Promise<void> {
  const users = getRegisteredUsers();
  const defaultEmail = 'architect@aurabim.com';
  if (!users[defaultEmail]) {
    const hash = await computePasswordHash('architect123');
    saveRegisteredUser({
      uid: 'local_user_architect_default',
      email: defaultEmail,
      displayName: 'AuraBIM Architect',
      passwordHash: hash,
      createdAt: 1700000000000
    });
  }
}

export function formatAuthError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Incorrect email or password. Please verify your credentials.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found with this email. Please create an account first.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email address format.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please try again in a few moments.';
  }
  return err?.message || 'Authentication error';
}
