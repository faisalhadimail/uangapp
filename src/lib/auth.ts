import { db } from "./db";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "kk_session";
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Password hashing (using Node.js built-in scrypt — no external deps)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const hashBuf = Buffer.from(hash, "hex");
    const testBuf = scryptSync(password, salt, 64);
    if (hashBuf.length !== testBuf.length) return false;
    return timingSafeEqual(hashBuf, testBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Create a new session for a user and set the cookie. Call from a Server Action / Route Handler. */
export async function createSession(userId: string) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt: expiresAt.toISOString(),
    },
  });

  // Set httpOnly cookie with 7-day expiry
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // 7 days in seconds
  });

  return { token, expiresAt };
}

/** Get the current user from the session cookie. Returns null if not authenticated. */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
  familyMemberId: string | null;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) return null;

    // Check expiry
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt.getTime() < Date.now()) {
      // Session expired — clean up
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      familyMemberId: session.user.familyMemberId,
    };
  } catch {
    return null;
  }
}

/** Destroy the current session and clear the cookie. */
export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {});
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore
  }
}

/** Clean up expired sessions (optional maintenance). */
export async function cleanupExpiredSessions() {
  try {
    await db.session.deleteMany({
      where: { expiresAt: { lt: new Date().toISOString() } },
    });
  } catch {
    // Ignore
  }
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_DAYS };
