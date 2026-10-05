import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/whatsapp/recipients
 * Returns all WhatsApp recipients, sorted by isActive desc then name.
 */
export async function GET() {
  try {
    const recipients = await db.whatsAppRecipient.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("GET /api/whatsapp/recipients error:", error);
    return NextResponse.json({ error: "Gagal memuat penerima" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/recipients
 * Body: { name, phone, role? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, role } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Nomor telepon wajib diisi" }, { status: 400 });
    }
    // Normalize: digits only, must start with country code (62 for Indonesia)
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.length < 10) {
      return NextResponse.json({ error: "Nomor telepon tidak valid" }, { status: 400 });
    }
    // If starts with 0, replace with 62
    const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`;
    if (role && !["spouse", "self", "family", "other"].includes(role)) {
      return NextResponse.json({ error: "Peran tidak valid" }, { status: 400 });
    }

    const recipient = await db.whatsAppRecipient.create({
      data: {
        name: name.trim(),
        phone: normalized,
        role: role ?? "spouse",
      },
    });
    return NextResponse.json({ recipient }, { status: 201 });
  } catch (error) {
    console.error("POST /api/whatsapp/recipients error:", error);
    return NextResponse.json({ error: "Gagal membuat penerima" }, { status: 500 });
  }
}

/**
 * PATCH /api/whatsapp/recipients
 * Body: { id, name?, phone?, role?, isActive? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, role, isActive } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof phone === "string") {
      const digits = phone.replace(/[^\d]/g, "");
      if (digits.length < 10) {
        return NextResponse.json({ error: "Nomor telepon tidak valid" }, { status: 400 });
      }
      data.phone = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`;
    }
    if (typeof role === "string" && ["spouse", "self", "family", "other"].includes(role)) data.role = role;
    if (typeof isActive === "boolean") data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const recipient = await db.whatsAppRecipient.update({ where: { id }, data });
    return NextResponse.json({ recipient });
  } catch (error) {
    console.error("PATCH /api/whatsapp/recipients error:", error);
    return NextResponse.json({ error: "Gagal memperbarui penerima" }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/recipients?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.whatsAppRecipient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/whatsapp/recipients error:", error);
    return NextResponse.json({ error: "Gagal menghapus penerima" }, { status: 500 });
  }
}
