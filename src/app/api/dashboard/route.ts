import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);

  // Ventes du jour
  const todaySales = await db.sale.findMany({ where: { date: { gte: start, lte: end } }, include: { items: true } });
  const revenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);
  const salesCount = todaySales.length;

  // Dépenses du jour
  const todayExpenses = await db.expense.findMany({ where: { date: { gte: start, lte: end } } });
  const expenses = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = revenue - expenses;

  // Tous les produits
  const products = await db.product.findMany();
  const lowStock = products.filter((p) => p.quantity <= p.minStock && p.quantity > 0);
  const outOfStock = products.filter((p) => p.quantity <= 0);
  const alerts = [
    ...lowStock.map((p) => ({ type: "low", message: `Stock faible: ${p.name} (${p.quantity} ${p.unit})`, productId: p.id })),
    ...outOfStock.map((p) => ({ type: "out", message: `Stock épuisé: ${p.name}`, productId: p.id })),
  ];

  // Top plats et boissons vendus (aujourd'hui)
  const saleItems = todaySales.flatMap((s) => s.items);
  const topDishes = aggregateTop(saleItems.filter((i) => i.itemType === "dish"), 5);
  const topDrinks = aggregateTop(saleItems.filter((i) => i.itemType === "drink"), 5);
  const topProducts = aggregateTop(saleItems.filter((i) => i.itemType === "product"), 5);

  // Graphiques: 7 derniers jours
  const days: { label: string; revenue: number; expenses: number; profit: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    const sSales = await db.sale.findMany({ where: { date: { gte: d, lte: e } } });
    const sExp = await db.expense.findMany({ where: { date: { gte: d, lte: e } } });
    const r = sSales.reduce((s, x) => s + x.totalAmount, 0);
    const ex = sExp.reduce((s, x) => s + x.amount, 0);
    days.push({ label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }), revenue: r, expenses: ex, profit: r - ex });
  }

  return NextResponse.json({
    today: { revenue, expenses, profit, salesCount },
    lowStock,
    outOfStock,
    alerts,
    topDishes,
    topDrinks,
    topProducts,
    chart: days,
  });
}

function aggregateTop(items: any[], limit: number) {
  const map = new Map<string, { name: string; quantity: number; total: number }>();
  for (const it of items) {
    const key = it.itemName;
    const cur = map.get(key) || { name: it.itemName, quantity: 0, total: 0 };
    cur.quantity += it.quantity;
    cur.total += it.total;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}
