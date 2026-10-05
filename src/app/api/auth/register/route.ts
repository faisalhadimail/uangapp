import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 *
 * Creates a new user and starts a session (7-day cookie).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body ?? {};

    // Validate
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
      },
    });

    // Create session (sets cookie)
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        familyMemberId: user.familyMemberId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
  }
}
