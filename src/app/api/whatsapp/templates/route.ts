import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_TEMPLATE_BODY, WEEKLY_TEMPLATE_BODY } from "@/lib/whatsapp";

/**
 * GET /api/whatsapp/templates
 * Returns all WhatsApp templates, sorted by isDefault desc then name.
 */
export async function GET() {
  try {
    const templates = await db.whatsAppTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET /api/whatsapp/templates error:", error);
    return NextResponse.json({ error: "Gagal memuat template" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/templates
 * Body: { name, body, reportType?, isDefault? }
 * Creates a new template. If isDefault=true, unsets others.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, body: templateBody, reportType, isDefault } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama template wajib diisi" }, { status: 400 });
    }
    if (!templateBody || typeof templateBody !== "string" || !templateBody.trim()) {
      return NextResponse.json({ error: "Isi pesan wajib diisi" }, { status: 400 });
    }
    if (reportType && !["monthly", "weekly", "custom"].includes(reportType)) {
      return NextResponse.json({ error: "Tipe laporan tidak valid" }, { status: 400 });
    }

    // If this is default, unset others
    if (isDefault) {
      await db.whatsAppTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await db.whatsAppTemplate.create({
      data: {
        name: name.trim(),
        body: templateBody,
        reportType: reportType ?? "monthly",
        isDefault: !!isDefault,
      },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("POST /api/whatsapp/templates error:", error);
    return NextResponse.json({ error: "Gagal membuat template" }, { status: 500 });
  }
}

/**
 * PATCH /api/whatsapp/templates
 * Body: { id, name?, body?, reportType?, isDefault? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, body: templateBody, reportType, isDefault } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof templateBody === "string" && templateBody.trim()) data.body = templateBody;
    if (typeof reportType === "string" && ["monthly", "weekly", "custom"].includes(reportType)) data.reportType = reportType;
    if (typeof isDefault === "boolean") {
      data.isDefault = isDefault;
      if (isDefault) {
        await db.whatsAppTemplate.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const template = await db.whatsAppTemplate.update({ where: { id }, data });
    return NextResponse.json({ template });
  } catch (error) {
    console.error("PATCH /api/whatsapp/templates error:", error);
    return NextResponse.json({ error: "Gagal memperbarui template" }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/templates?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.whatsAppTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/whatsapp/templates error:", error);
    return NextResponse.json({ error: "Gagal menghapus template" }, { status: 500 });
  }
}

/** Ensure default templates exist (called from seed). */
export async function ensureDefaultTemplates() {
  const count = await db.whatsAppTemplate.count();
  if (count > 0) return;

  await db.whatsAppTemplate.create({
    data: {
      name: "Laporan Bulanan Lengkap",
      body: DEFAULT_TEMPLATE_BODY,
      reportType: "monthly",
      isDefault: true,
    },
  });
  await db.whatsAppTemplate.create({
    data: {
      name: "Update Mingguan Singkat",
      body: WEEKLY_TEMPLATE_BODY,
      reportType: "weekly",
      isDefault: false,
    },
  });
}
