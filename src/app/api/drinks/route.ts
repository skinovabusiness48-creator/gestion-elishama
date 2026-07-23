import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.drink.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, photo, price, description, available } = body;
    if (!name || !name.trim()) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    const created = await db.drink.create({
      data: { name: name.trim(), photo: photo || null, price: Number(price) || 0, description: description || null, available: available !== undefined ? !!available : true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
