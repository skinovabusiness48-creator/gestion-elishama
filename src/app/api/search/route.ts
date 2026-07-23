import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ products: [], dishes: [], drinks: [], sales: [], expenses: [], stockEntries: [] });

  const [products, dishes, drinks, sales, expenses, stockEntries] = await Promise.all([
    db.product.findMany({ where: { OR: [{ name: { contains: q } }, { internalCode: { contains: q } }, { description: { contains: q } }] }, include: { category: true } }),
    db.dish.findMany({ where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] } }),
    db.drink.findMany({ where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] } }),
    db.sale.findMany({ where: { OR: [{ note: { contains: q } }] }, include: { items: true }, orderBy: { date: "desc" }, take: 30 }),
    db.expense.findMany({ where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] }, include: { category: true }, orderBy: { date: "desc" }, take: 30 }),
    db.stockEntry.findMany({ where: { OR: [{ productName: { contains: q } }, { supplierName: { contains: q } }, { observation: { contains: q } }] }, include: { product: true, supplier: true }, orderBy: { date: "desc" }, take: 30 }),
  ]);

  return NextResponse.json({ products, dishes, drinks, sales, expenses, stockEntries });
}
