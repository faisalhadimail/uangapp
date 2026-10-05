import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Destroys the current session and clears the cookie.
 */
export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ error: "Gagal logout" }, { status: 500 });
  }
}
