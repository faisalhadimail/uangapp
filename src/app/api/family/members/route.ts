import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/family/members
 * Returns all family members, sorted by isCurrentUser desc then name.
 * Includes transaction count per member.
 */
export async function GET() {
  try {
    const members = await db.familyMember.findMany({
      orderBy: [{ isCurrentUser: "desc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { transactions: true } },
      },
    });

    const result = members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      color: m.color,
      avatar: m.avatar,
      isActive: m.isActive,
      isCurrentUser: m.isCurrentUser,
      transactionCount: m._count.transactions,
    }));

    return NextResponse.json({ members: result });
  } catch (error) {
    console.error("GET /api/family/members error:", error);
    return NextResponse.json({ error: "Gagal memuat anggota keluarga" }, { status: 500 });
  }
}

/**
 * POST /api/family/members
 * Body: { name, role?, color? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, color, avatar } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama anggota wajib diisi" }, { status: 400 });
    }
    if (role && !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Peran tidak valid" }, { status: 400 });
    }

    const member = await db.familyMember.create({
      data: {
        name: name.trim(),
        role: role ?? "editor",
        color: typeof color === "string" ? color : "#10b981",
        avatar: typeof avatar === "string" ? avatar : name.trim().charAt(0).toUpperCase(),
        isCurrentUser: false,
      },
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("POST /api/family/members error:", error);
    return NextResponse.json({ error: "Gagal membuat anggota" }, { status: 500 });
  }
}

/**
 * PATCH /api/family/members
 * Body: { id, name?, role?, color?, avatar?, isActive?, isCurrentUser? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, role, color, avatar, isActive, isCurrentUser } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof role === "string" && ["admin", "editor", "viewer"].includes(role)) data.role = role;
    if (typeof color === "string") data.color = color;
    if (typeof avatar === "string") data.avatar = avatar;
    if (typeof isActive === "boolean") data.isActive = isActive;

    // If setting as current user, unset others
    if (isCurrentUser === true) {
      await db.familyMember.updateMany({
        where: { isCurrentUser: true, NOT: { id } },
        data: { isCurrentUser: false },
      });
      data.isCurrentUser = true;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const member = await db.familyMember.update({ where: { id }, data });
    return NextResponse.json({ member });
  } catch (error) {
    console.error("PATCH /api/family/members error:", error);
    return NextResponse.json({ error: "Gagal memperbarui anggota" }, { status: 500 });
  }
}

/**
 * DELETE /api/family/members?id=ID
 * Cannot delete the last admin or current user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const member = await db.familyMember.findUnique({ where: { id } });
    if (!member) {
      return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    }
    if (member.isCurrentUser) {
      return NextResponse.json({ error: "Tidak dapat menghapus pengguna saat ini" }, { status: 400 });
    }

    // Check if this is the last admin
    if (member.role === "admin") {
      const adminCount = await db.familyMember.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Tidak dapat menghapus admin terakhir" }, { status: 400 });
      }
    }

    await db.familyMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/family/members error:", error);
    return NextResponse.json({ error: "Gagal menghapus anggota" }, { status: 500 });
  }
}
