import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Validates credentials and creates a 7-day session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    // Verify password
    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    // Create session (sets cookie)
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        familyMemberId: user.familyMemberId,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}
