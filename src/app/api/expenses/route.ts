import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const period = searchParams.get("period");

  let dateFilter: any = {};
  const now = new Date();
  if (period === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    dateFilter = { gte: s, lte: e };
  } else if (period === "week") {
    const s = new Date(now); s.setDate(s.getDate() - 7);
    dateFilter = { gte: s };
  } else if (period === "month") {
    const s = new Date(now); s.setMonth(s.getMonth() - 1);
    dateFilter = { gte: s };
  } else if (period === "year") {
    const s = new Date(now); s.setFullYear(now.getFullYear() - 1);
    dateFilter = { gte: s };
  } else if (from || to) {
    dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
  }

  const items = await db.expense.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, amount, date, description, photo, categoryId } = body;
    if (!name || !name.trim()) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    if (amount === undefined || Number(amount) < 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    const created = await db.expense.create({
      data: {
        name: name.trim(),
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description: description || null,
        photo: photo || null,
        categoryId: categoryId || null,
      },
      include: { category: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
