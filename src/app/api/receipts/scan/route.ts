import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todayISO } from "@/lib/format";

/**
 * GET /api/receipts/scan
 * Returns all receipt scans, most recent first.
 */
export async function GET() {
  try {
    const scans = await db.receiptScan.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ scans });
  } catch (error) {
    console.error("GET /api/receipts/scan error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat scan" }, { status: 500 });
  }
}

/**
 * POST /api/receipts/scan
 * Body: { filename } — simulates uploading a receipt image.
 *
 * Returns a mock OCR result with detected merchant, amount, date, category.
 * The result is saved as a ReceiptScan record with status "pending".
 *
 * In production, this would integrate with an OCR service (Google Vision, AWS Textract, etc).
 * Here we generate realistic mock data for demo purposes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body ?? {};

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Filename wajib diisi" }, { status: 400 });
    }

    // Simulate OCR processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate mock OCR result based on filename or random selection
    const mockMerchants = [
      { name: "Indomaret", category: "Belanja Bulanan", icon: "ShoppingCart", color: "#eab308", amountRange: [25000, 250000] },
      { name: "Alfamart", category: "Belanja Bulanan", icon: "ShoppingCart", color: "#eab308", amountRange: [20000, 200000] },
      { name: "GoFood", category: "Makan & Minum", icon: "UtensilsCrossed", color: "#f97316", amountRange: [15000, 85000] },
      { name: "GrabFood", category: "Makan & Minum", icon: "UtensilsCrossed", color: "#f97316", amountRange: [18000, 95000] },
      { name: "Pertamina", category: "Transportasi", icon: "Car", color: "#3b82f6", amountRange: [50000, 250000] },
      { name: "Shell", category: "Transportasi", icon: "Car", color: "#3b82f6", amountRange: [60000, 280000] },
      { name: "PLN Token", category: "Listrik & Air", icon: "Zap", color: "#facc15", amountRange: [50000, 500000] },
      { name: "Tokopedia", category: "Lainnya", icon: "ShoppingBag", color: "#84cc16", amountRange: [30000, 500000] },
      { name: "Shopee", category: "Lainnya", icon: "ShoppingBag", color: "#84cc16", amountRange: [25000, 450000] },
      { name: "Kopi Kenangan", category: "Makan & Minum", icon: "UtensilsCrossed", color: "#f97316", amountRange: [18000, 55000] },
      { name: "Klinik Sehat", category: "Kesehatan", icon: "HeartPulse", color: "#ec4899", amountRange: [50000, 350000] },
      { name: "Apotek Kimia Farma", category: "Kesehatan", icon: "HeartPulse", color: "#ec4899", amountRange: [15000, 250000] },
    ];

    // Pick a random merchant (or based on filename hint)
    const lowerFilename = filename.toLowerCase();
    let selectedMerchant = mockMerchants[Math.floor(Math.random() * mockMerchants.length)];

    // Try to match filename to merchant
    const matched = mockMerchants.find((m) =>
      lowerFilename.includes(m.name.toLowerCase().split(" ")[0]),
    );
    if (matched) selectedMerchant = matched;

    // Generate random amount within range
    const [min, max] = selectedMerchant.amountRange;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    // Round to nearest 1000
    const roundedAmount = Math.round(amount / 1000) * 1000;

    // Try to find matching category in DB
    const category = await db.category.findFirst({
      where: { name: selectedMerchant.category, type: "expense" },
    });

    const scan = await db.receiptScan.create({
      data: {
        createdAt: new Date().toISOString(),
        filename,
        merchant: selectedMerchant.name,
        totalAmount: roundedAmount,
        date: todayISO(),
        suggestedCategory: category?.id ?? null,
        status: "pending",
      },
    });

    // Simulate confidence score and detected items for richer UI
    const detectedItems = generateMockItems(selectedMerchant.name, roundedAmount);

    return NextResponse.json({
      scan,
      detected: {
        merchant: selectedMerchant.name,
        merchantIcon: selectedMerchant.icon,
        merchantColor: selectedMerchant.color,
        totalAmount: roundedAmount,
        date: todayISO(),
        categoryName: selectedMerchant.category,
        categoryId: category?.id ?? null,
        items: detectedItems,
        confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
      },
    });
  } catch (error) {
    console.error("POST /api/receipts/scan error:", error);
    return NextResponse.json({ error: "Gagal memproses scan struk" }, { status: 500 });
  }
}

/**
 * PATCH /api/receipts/scan
 * Body: { id, status: "confirmed" | "rejected", transactionId? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, transactionId } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    if (!["confirmed", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const scan = await db.receiptScan.update({
      where: { id },
      data: {
        status,
        transactionId: transactionId ?? null,
      },
    });
    return NextResponse.json({ scan });
  } catch (error) {
    console.error("PATCH /api/receipts/scan error:", error);
    return NextResponse.json({ error: "Gagal memperbarui scan" }, { status: 500 });
  }
}

/**
 * DELETE /api/receipts/scan?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.receiptScan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/receipts/scan error:", error);
    return NextResponse.json({ error: "Gagal menghapus scan" }, { status: 500 });
  }
}

function generateMockItems(merchant: string, total: number): Array<{ name: string; qty: number; price: number }> {
  const itemsByMerchant: Record<string, Array<{ name: string; price: number }>> = {
    Indomaret: [
      { name: "Beras 5kg", price: 65000 },
      { name: "Minyak Goreng 2L", price: 38000 },
      { name: "Telur 1kg", price: 28000 },
      { name: "Gula 1kg", price: 15000 },
      { name: "Kopi Sachet", price: 8500 },
      { name: "Air Mineral 600ml", price: 4000 },
      { name: "Mie Instan", price: 3500 },
      { name: "Roti Tawar", price: 18000 },
    ],
    Alfamart: [
      { name: "Susu UHT 1L", price: 22000 },
      { name: "Roti Tawar", price: 18000 },
      { name: "Sabun Mandi", price: 7500 },
      { name: "Shampoo Sachet", price: 1000 },
      { name: "Air Mineral", price: 4000 },
      { name: "Snack", price: 12000 },
    ],
    GoFood: [
      { name: "Nasi Goreng Spesial", price: 28000 },
      { name: "Es Teh Manis", price: 5000 },
      { name: "Ayam Geprek", price: 25000 },
      { name: "Mie Ayam", price: 20000 },
      { name: "Es Jeruk", price: 6000 },
    ],
    GrabFood: [
      { name: "Ayam Bakar", price: 35000 },
      { name: "Nasi Putih", price: 5000 },
      { name: "Lalapan", price: 8000 },
      { name: "Es Teh", price: 5000 },
      { name: "Sambal", price: 3000 },
    ],
    Pertamina: [
      { name: "Pertalite 10L", price: 100000 },
      { name: "Pertamax 8L", price: 96000 },
    ],
    "PLN Token": [
      { name: "Token Listrik", price: 100000 },
    ],
    "Kopi Kenangan": [
      { name: "Es Kopi Susu", price: 22000 },
      { name: "Croissant", price: 18000 },
    ],
    default: [
      { name: "Item 1", price: Math.floor(total * 0.6) },
      { name: "Item 2", price: Math.floor(total * 0.4) },
    ],
  };

  const pool = itemsByMerchant[merchant] ?? itemsByMerchant.default;
  const numItems = Math.floor(Math.random() * 3) + 1;
  const items: Array<{ name: string; qty: number; price: number }> = [];
  for (let i = 0; i < numItems; i++) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    items.push({ name: item.name, qty: 1, price: item.price });
  }
  return items;
}
