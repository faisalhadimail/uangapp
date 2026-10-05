import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeNextRun } from "@/lib/whatsapp";
import { currentMonthKey } from "@/lib/format";

/**
 * GET /api/whatsapp/scheduled
 * Returns all scheduled reports with their template and recent logs.
 * Also triggers a check: if nextRunAt <= now and isActive, mark as "due".
 */
export async function GET(request: NextRequest) {
  try {
    const includeLogs = request.nextUrl.searchParams.get("includeLogs") === "true";

    const schedules = await db.scheduledReport.findMany({
      orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
      include: { template: true },
    });

    // Parse recipientIds and check if any are due
    const now = new Date();
    const result = schedules.map((s) => {
      const recipientIds = s.recipientIds
        ? s.recipientIds.split("|").filter(Boolean)
        : [];
      const nextRun = new Date(s.nextRunAt);
      const isDue = s.isActive && nextRun.getTime() <= now.getTime();
      return {
        id: s.id,
        name: s.name,
        frequency: s.frequency,
        dayOfWeek: s.dayOfWeek,
        hour: s.hour,
        minute: s.minute,
        nextRunAt: s.nextRunAt,
        isActive: s.isActive,
        templateId: s.templateId,
        template: s.template,
        recipientIds,
        recipientCount: recipientIds.length,
        isDue,
      };
    });

    if (includeLogs) {
      // Attach recent logs to each
      const withLogs = await Promise.all(
        result.map(async (s) => {
          const logs = await db.scheduledReportLog.findMany({
            where: { scheduledReportId: s.id },
            orderBy: { sentAt: "desc" },
            take: 5,
          });
          return { ...s, recentLogs: logs };
        }),
      );
      return NextResponse.json({ schedules: withLogs });
    }

    return NextResponse.json({ schedules: result });
  } catch (error) {
    console.error("GET /api/whatsapp/scheduled error:", error);
    return NextResponse.json({ error: "Gagal memuat jadwal" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/scheduled
 * Body: { name, frequency, dayOfWeek, hour, minute, templateId?, recipientIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, frequency, dayOfWeek, hour, minute, templateId, recipientIds } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama jadwal wajib diisi" }, { status: 400 });
    }
    if (!["monthly", "weekly"].includes(frequency)) {
      return NextResponse.json({ error: "Frekuensi harus 'monthly' atau 'weekly'" }, { status: 400 });
    }
    if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || (frequency === "monthly" && dayOfWeek > 28) || (frequency === "weekly" && dayOfWeek > 6)) {
      return NextResponse.json({ error: "Hari tidak valid" }, { status: 400 });
    }
    if (typeof hour !== "number" || hour < 0 || hour > 23) {
      return NextResponse.json({ error: "Jam tidak valid (0-23)" }, { status: 400 });
    }
    if (typeof minute !== "number" || ![0, 15, 30, 45].includes(minute)) {
      return NextResponse.json({ error: "Menit tidak valid (0/15/30/45)" }, { status: 400 });
    }
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu penerima" }, { status: 400 });
    }

    const nextRunAt = computeNextRun(frequency, dayOfWeek, hour, minute);

    const schedule = await db.scheduledReport.create({
      data: {
        name: name.trim(),
        frequency,
        dayOfWeek,
        hour,
        minute,
        nextRunAt,
        templateId: typeof templateId === "string" ? templateId : null,
        recipientIds: recipientIds.join("|"),
      },
      include: { template: true },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("POST /api/whatsapp/scheduled error:", error);
    return NextResponse.json({ error: "Gagal membuat jadwal" }, { status: 500 });
  }
}

/**
 * PATCH /api/whatsapp/scheduled
 * Body: { id, isActive?, name?, frequency?, dayOfWeek?, hour?, minute?, templateId?, recipientIds? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive, name, frequency, dayOfWeek, hour, minute, templateId, recipientIds } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof frequency === "string" && ["monthly", "weekly"].includes(frequency)) data.frequency = frequency;
    if (typeof dayOfWeek === "number") data.dayOfWeek = dayOfWeek;
    if (typeof hour === "number") data.hour = hour;
    if (typeof minute === "number") data.minute = minute;
    if (typeof templateId === "string") data.templateId = templateId || null;
    if (Array.isArray(recipientIds)) data.recipientIds = recipientIds.join("|");

    // If schedule was just re-activated or timing changed, recompute nextRunAt
    const shouldRecompute =
      data.isActive === true || data.frequency || data.dayOfWeek !== undefined || data.hour !== undefined || data.minute !== undefined;
    if (shouldRecompute) {
      const existing = await db.scheduledReport.findUnique({ where: { id } });
      if (existing) {
        const freq = (data.frequency as string) ?? existing.frequency;
        const day = data.dayOfWeek !== undefined ? (data.dayOfWeek as number) : existing.dayOfWeek;
        const h = data.hour !== undefined ? (data.hour as number) : existing.hour;
        const m = data.minute !== undefined ? (data.minute as number) : existing.minute;
        data.nextRunAt = computeNextRun(freq as "monthly" | "weekly", day, h, m);
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const schedule = await db.scheduledReport.update({
      where: { id },
      data,
      include: { template: true },
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("PATCH /api/whatsapp/scheduled error:", error);
    return NextResponse.json({ error: "Gagal memperbarui jadwal" }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/scheduled?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.scheduledReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/whatsapp/scheduled error:", error);
    return NextResponse.json({ error: "Gagal menghapus jadwal" }, { status: 500 });
  }
}

/**
 * Mark a schedule as "sent" and compute the next run.
 * Called from /api/whatsapp/send after a successful delivery.
 */
export async function markScheduleSent(scheduleId: string, preview: string) {
  const schedule = await db.scheduledReport.findUnique({ where: { id: scheduleId } });
  if (!schedule) return;

  // Log the send
  await db.scheduledReportLog.create({
    data: {
      scheduledReportId: scheduleId,
      sentAt: new Date().toISOString(),
      status: "sent",
      preview: preview.slice(0, 200),
    },
  });

  // Compute next run
  const nextRunAt = computeNextRun(
    schedule.frequency as "monthly" | "weekly",
    schedule.dayOfWeek,
    schedule.hour,
    schedule.minute,
  );
  await db.scheduledReport.update({
    where: { id: scheduleId },
    data: { nextRunAt },
  });
}
