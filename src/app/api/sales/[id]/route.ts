import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.sale.findUnique({ where: { id }, include: { items: true } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!sale) throw new Error("Introuvable");
      // Réincrémenter le stock des produits
      for (const it of sale.items) {
        if (it.itemType === "product" && it.productId) {
          await tx.product.update({ where: { id: it.productId }, data: { quantity: { increment: it.quantity } } });
        }
      }
      await tx.sale.delete({ where: { id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
