import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const lowStock = searchParams.get("lowStock") === "1";
  const outOfStock = searchParams.get("outOfStock") === "1";
  const available = searchParams.get("available");

  const items = await db.product.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(available === "true" ? { available: true } : available === "false" ? { available: false } : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  let result = items;
  if (lowStock) result = items.filter((p) => p.quantity <= p.minStock && p.quantity > 0);
  if (outOfStock) result = items.filter((p) => p.quantity <= 0);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, categoryId, photo, purchasePrice, salePrice, quantity, minStock, unit, description, available, internalCode } = body;
    if (!name || !name.trim()) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    const created = await db.product.create({
      data: {
        name: name.trim(),
        categoryId: categoryId || null,
        photo: photo || null,
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 0,
        unit: unit || "unité",
        description: description || null,
        available: available !== undefined ? !!available : true,
        internalCode: internalCode || null,
      },
      include: { category: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
