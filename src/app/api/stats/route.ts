import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const now = new Date();

  let start = new Date(now); start.setMonth(now.getMonth() - 1);
  let end = new Date(now);
  if (from) start = new Date(from);
  if (to) end = new Date(to);

  const sales = await db.sale.findMany({ where: { date: { gte: start, lte: end } }, include: { items: true } });
  const expenses = await db.expense.findMany({ where: { date: { gte: start, lte: end } }, include: { category: true } });

  // Top vendus (par quantité)
  const allItems = sales.flatMap((s) => s.items);
  const topSold = aggregate(allItems).sort((a, b) => b.quantity - a.quantity);
  const leastSold = aggregate(allItems).sort((a, b) => a.quantity - b.quantity);
  const topRevenue = aggregate(allItems).sort((a, b) => b.total - a.total);

  // Dépenses les plus importantes
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 10).map((e) => ({ name: e.name, amount: e.amount, category: e.category?.name || "Sans catégorie", date: e.date }));

  // Par type
  const byType = {
    dish: { quantity: 0, total: 0 },
    drink: { quantity: 0, total: 0 },
    product: { quantity: 0, total: 0 },
  };
  for (const it of allItems) {
    if (byType[it.itemType as keyof typeof byType]) {
      byType[it.itemType as keyof typeof byType].quantity += it.quantity;
      byType[it.itemType as keyof typeof byType].total += it.total;
    }
  }

  return NextResponse.json({
    period: { from: start, to: end },
    topSold: topSold.slice(0, 10),
    leastSold: leastSold.slice(0, 10),
    topRevenue: topRevenue.slice(0, 10),
    topExpenses,
    byType,
    totalRevenue: sales.reduce((s, x) => s + x.totalAmount, 0),
    totalExpenses: expenses.reduce((s, x) => s + x.amount, 0),
    totalSales: sales.length,
  });
}

function aggregate(items: any[]) {
  const map = new Map<string, { name: string; type: string; quantity: number; total: number }>();
  for (const it of items) {
    const cur = map.get(it.itemName) || { name: it.itemName, type: it.itemType, quantity: 0, total: 0 };
    cur.quantity += it.quantity;
    cur.total += it.total;
    map.set(it.itemName, cur);
  }
  return Array.from(map.values());
}
