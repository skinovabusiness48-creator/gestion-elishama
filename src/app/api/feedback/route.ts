import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.customerFeedback.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemName, itemType, feedback, date } = body;
    if (!feedback || !feedback.trim()) return NextResponse.json({ error: "Le retour est requis" }, { status: 400 });
    const created = await db.customerFeedback.create({
      data: { itemName: itemName || null, itemType: itemType || null, feedback: feedback.trim(), date: date ? new Date(date) : new Date() },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
