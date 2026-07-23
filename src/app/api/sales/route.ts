import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const period = searchParams.get("period"); // today, week, month, year

  let dateFilter: any = {};
  const now = new Date();
  if (period === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    dateFilter = { gte: s, lte: e };
  } else if (period === "week") {
    const s = new Date(now); s.setDate(s.getDate() - 7);
    dateFilter = { gte: s };
  } else if (period === "month") {
    const s = new Date(now); s.setMonth(s.getMonth() - 1);
    dateFilter = { gte: s };
  } else if (period === "year") {
    const s = new Date(now); s.setFullYear(now.getFullYear() - 1);
    dateFilter = { gte: s };
  } else if (from || to) {
    dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
  }

  const items = await db.sale.findMany({
    where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
    include: { items: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, note, items } = body as { date?: string; note?: string; items: Array<any> };
    if (!items || !items.length) return NextResponse.json({ error: "La vente doit contenir au moins un article" }, { status: 400 });

    const totalAmount = items.reduce((sum: number, it: any) => sum + (Number(it.total) || Number(it.unitPrice) * Number(it.quantity) || 0), 0);

    const created = await db.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          date: date ? new Date(date) : new Date(),
          totalAmount,
          note: note || null,
          items: {
            create: items.map((it: any) => ({
              itemType: it.itemType,
              productId: it.productId || null,
              dishId: it.dishId || null,
              drinkId: it.drinkId || null,
              itemName: it.itemName,
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              total: Number(it.total) || Number(it.unitPrice) * Number(it.quantity) || 0,
            })),
          },
        },
        include: { items: true },
      });

      // Décrémenter le stock des produits vendus
      for (const it of items) {
        if (it.itemType === "product" && it.productId) {
          await tx.product.update({ where: { id: it.productId }, data: { quantity: { decrement: Number(it.quantity) || 1 } } });
        }
      }
      return sale;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
