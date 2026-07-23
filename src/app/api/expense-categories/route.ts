import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.expenseCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { expenses: true } } } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, emoji } = body;
    if (!name || !name.trim()) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    const created = await db.expenseCategory.create({ data: { name: name.trim(), emoji: emoji || null } });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
