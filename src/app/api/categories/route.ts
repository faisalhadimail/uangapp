import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/categories
 * Optional query: ?type=income|expense
 * Returns the categories sorted by name.
 */
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    const categories = await db.category.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Body: { name, type: "income"|"expense", color?, icon? }
 * Creates a new category.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, color, icon } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    if (!["income", "expense"].includes(type)) {
      return NextResponse.json({ error: "Tipe harus 'income' atau 'expense'" }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        type,
        color: typeof color === "string" ? color : "#10b981",
        icon: typeof icon === "string" ? icon : "Wallet",
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Gagal membuat kategori" }, { status: 500 });
  }
}
