// WebAuthn / Platform Authenticator (Face ID, Touch ID)
// Used as an app-lock layer on top of the existing Supabase session.

const CRED_KEY = "fh_biometric_cred";
const ENABLED_KEY = "fh_biometric_enabled";
const HIDE_TS_KEY = "fh_hide_ts";

export const LOCK_TIMEOUT_MS = 30_000; // lock after 30 s in background

// ─── Availability ─────────────────────────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "true";
}

// ─── Encoding helpers ─────────────────────────────────────────────────────────

function toBase64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerBiometric(
  userId: string,
  userEmail: string,
  displayName: string
): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId.slice(0, 64));

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "FinanceHub", id: window.location.hostname },
        user: { id: userIdBytes, name: userEmail, displayName: displayName || userEmail },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return false;

    localStorage.setItem(CRED_KEY, toBase64url(new Uint8Array(cred.rawId)));
    localStorage.setItem(ENABLED_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

// ─── Authenticate ─────────────────────────────────────────────────────────────

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const stored = localStorage.getItem(CRED_KEY);
    if (!stored) return false;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          { id: fromBase64url(stored), type: "public-key", transports: ["internal"] },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}

// ─── Disable ──────────────────────────────────────────────────────────────────

export function disableBiometric(): void {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(ENABLED_KEY);
}

// ─── Background lock helpers ──────────────────────────────────────────────────

export function recordHideTimestamp(): void {
  sessionStorage.setItem(HIDE_TS_KEY, String(Date.now()));
}

export function shouldLockOnResume(): boolean {
  const ts = sessionStorage.getItem(HIDE_TS_KEY);
  if (!ts) return false;
  const elapsed = Date.now() - Number(ts);
  return elapsed >= LOCK_TIMEOUT_MS;
}

export function clearHideTimestamp(): void {
  sessionStorage.removeItem(HIDE_TS_KEY);
}
