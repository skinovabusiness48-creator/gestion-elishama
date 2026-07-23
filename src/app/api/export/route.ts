import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "sales";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let dateFilter: any = {};
  const now = new Date();
  if (from || to) {
    dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
  }

  let rows: any[] = [];
  let headers: string[] = [];
  let filename = type;

  if (type === "sales") {
    headers = ["Date", "Articles", "Quantité totale", "Montant total", "Note"];
    const sales = await db.sale.findMany({ where: Object.keys(dateFilter).length ? { date: dateFilter } : {}, include: { items: true }, orderBy: { date: "desc" } });
    rows = sales.map((s) => [s.date.toLocaleString("fr-FR"), s.items.map((i) => `${i.itemName} x${i.quantity}`).join("; "), s.items.reduce((a, b) => a + b.quantity, 0), s.totalAmount, s.note || ""]);
    filename = "ventes";
  } else if (type === "expenses") {
    headers = ["Date", "Nom", "Montant", "Catégorie", "Description"];
    const expenses = await db.expense.findMany({ where: Object.keys(dateFilter).length ? { date: dateFilter } : {}, include: { category: true }, orderBy: { date: "desc" } });
    rows = expenses.map((e) => [e.date.toLocaleString("fr-FR"), e.name, e.amount, e.category?.name || "", e.description || ""]);
    filename = "depenses";
  } else if (type === "products") {
    headers = ["Nom", "Catégorie", "Prix achat", "Prix vente", "Quantité", "Stock min", "Unité", "Disponible", "Code interne"];
    const products = await db.product.findMany({ include: { category: true }, orderBy: { name: "asc" } });
    rows = products.map((p) => [p.name, p.category?.name || "", p.purchasePrice, p.salePrice, p.quantity, p.minStock, p.unit, p.available ? "Oui" : "Non", p.internalCode || ""]);
    filename = "produits";
  } else if (type === "stock-entries") {
    headers = ["Date", "Produit", "Fournisseur", "Quantité", "Prix unitaire", "Total", "Observation"];
    const entries = await db.stockEntry.findMany({ where: Object.keys(dateFilter).length ? { date: dateFilter } : {}, include: { product: true, supplier: true }, orderBy: { date: "desc" } });
    rows = entries.map((e) => [e.date.toLocaleString("fr-FR"), e.productName, e.supplierName || "", e.quantity, e.unitPrice, e.quantity * e.unitPrice, e.observation || ""]);
    filename = "entrees_stock";
  } else if (type === "dishes") {
    headers = ["Nom", "Prix", "Disponible", "Description"];
    const dishes = await db.dish.findMany({ orderBy: { name: "asc" } });
    rows = dishes.map((d) => [d.name, d.price, d.available ? "Oui" : "Non", d.description || ""]);
    filename = "plats";
  } else if (type === "drinks") {
    headers = ["Nom", "Prix", "Disponible", "Description"];
    const drinks = await db.drink.findMany({ orderBy: { name: "asc" } });
    rows = drinks.map((d) => [d.name, d.price, d.available ? "Oui" : "Non", d.description || ""]);
    filename = "boissons";
  } else if (type === "accounting") {
    headers = ["Type", "Date", "Libellé", "Montant"];
    const sales = await db.sale.findMany({ where: Object.keys(dateFilter).length ? { date: dateFilter } : {}, include: { items: true }, orderBy: { date: "desc" } });
    const expenses = await db.expense.findMany({ where: Object.keys(dateFilter).length ? { date: dateFilter } : {}, orderBy: { date: "desc" } });
    for (const s of sales) rows.push(["Entrée", s.date.toLocaleString("fr-FR"), `Vente (${s.items?.length || 0} articles)`, s.totalAmount]);
    for (const e of expenses) rows.push(["Sortie", e.date.toLocaleString("fr-FR"), e.name, -e.amount]);
    filename = "comptabilite";
  }

  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
