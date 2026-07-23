import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.stockEntry.findUnique({ where: { id }, include: { product: true, supplier: true } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { date, productId, productName, supplierId, supplierName, quantity, unitPrice, observation } = body;
    const updated = await db.$transaction(async (tx) => {
      const existing = await tx.stockEntry.findUnique({ where: { id } });
      if (!existing) throw new Error("Introuvable");
      const oldQty = existing.quantity;
      const newQty = Number(quantity) || 0;
      const diff = newQty - oldQty;

      // Ajuster le stock du produit si même produit
      if (existing.productId && existing.productId === productId && diff !== 0) {
        await tx.product.update({ where: { id: existing.productId }, data: { quantity: { increment: diff } } });
      } else if (existing.productId && existing.productId !== productId) {
        // Annuler l'ancien incrément
        await tx.product.update({ where: { id: existing.productId }, data: { quantity: { decrement: oldQty } } });
        if (productId) await tx.product.update({ where: { id: productId }, data: { quantity: { increment: newQty } } });
      }

      return tx.stockEntry.update({
        where: { id },
        data: {
          date: date ? new Date(date) : undefined,
          productId: productId || null,
          productName,
          supplierId: supplierId || null,
          supplierName: supplierName || null,
          quantity: newQty,
          unitPrice: Number(unitPrice) || 0,
          observation: observation || null,
        },
        include: { product: true, supplier: true },
      });
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.stockEntry.findUnique({ where: { id } });
      if (!existing) throw new Error("Introuvable");
      // Décrémenter le stock du produit
      if (existing.productId) {
        await tx.product.update({ where: { id: existing.productId }, data: { quantity: { decrement: existing.quantity } } });
      }
      await tx.stockEntry.delete({ where: { id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
