import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const supplierId = searchParams.get("supplierId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const items = await db.stockEntry.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    include: { product: true, supplier: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, productId, productName, supplierId, supplierName, quantity, unitPrice, observation } = body;
    if (!productName || !productName.trim()) return NextResponse.json({ error: "Le produit est requis" }, { status: 400 });
    const qty = Number(quantity) || 0;
    if (qty <= 0) return NextResponse.json({ error: "La quantité doit être positive" }, { status: 400 });

    const created = await db.$transaction(async (tx) => {
      const entry = await tx.stockEntry.create({
        data: {
          date: date ? new Date(date) : new Date(),
          productId: productId || null,
          productName: productName.trim(),
          supplierId: supplierId || null,
          supplierName: supplierName || null,
          quantity: qty,
          unitPrice: Number(unitPrice) || 0,
          observation: observation || null,
        },
        include: { product: true, supplier: true },
      });
      // Incrémenter le stock du produit
      if (productId) {
        await tx.product.update({ where: { id: productId }, data: { quantity: { increment: qty } } });
      }
      return entry;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
