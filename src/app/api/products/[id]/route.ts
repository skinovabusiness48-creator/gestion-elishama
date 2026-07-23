import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.product.findUnique({ where: { id }, include: { category: true, stockEntries: { orderBy: { date: "desc" } } } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, categoryId, photo, purchasePrice, salePrice, quantity, minStock, unit, description, available, internalCode } = body;
    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        categoryId: categoryId || null,
        photo: photo ?? undefined,
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 0,
        unit: unit || "unité",
        description: description || null,
        available: available !== undefined ? !!available : undefined,
        internalCode: internalCode || null,
      },
      include: { category: true },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
