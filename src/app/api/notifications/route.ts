import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/notifications
 * Query: ?unreadOnly=true (optional)
 * Returns notifications, most recent first.
 */
export async function GET(request: NextRequest) {
  try {
    const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
    const limit = request.nextUrl.searchParams.get("limit");

    const where: Record<string, unknown> = {};
    if (unreadOnly) where.readAt = null;

    const notifications = await db.notification.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit ? Number(limit) : 50,
    });

    const unreadCount = await db.notification.count({ where: { readAt: null } });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Gagal memuat notifikasi" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Body: { id } — mark single notification as read
 * Body: { markAllRead: true } — mark all as read
 * Body: { id, clear: true } — delete single notification
 * Body: { clearAll: true } — delete all read notifications
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAllRead, clear, clearAll } = body ?? {};

    if (markAllRead === true) {
      await db.notification.updateMany({
        where: { readAt: null },
        data: { readAt: new Date().toISOString() },
      });
      return NextResponse.json({ success: true, marked: "all" });
    }

    if (clearAll === true) {
      await db.notification.deleteMany({ where: { readAt: { not: null } } });
      return NextResponse.json({ success: true, cleared: "all_read" });
    }

    if (id && clear === true) {
      await db.notification.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (id) {
      const notification = await db.notification.update({
        where: { id },
        data: { readAt: new Date().toISOString() },
      });
      return NextResponse.json({ notification });
    }

    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Gagal memperbarui notifikasi" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications?id=ID or ?allRead=true
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const allRead = request.nextUrl.searchParams.get("allRead") === "true";

    if (allRead) {
      await db.notification.deleteMany({ where: { readAt: { not: null } } });
      return NextResponse.json({ success: true });
    }

    if (id) {
      await db.notification.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json({ error: "Gagal menghapus notifikasi" }, { status: 500 });
  }
}
