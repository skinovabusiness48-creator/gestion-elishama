import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const zip = new AdmZip(buffer);

    // Fermer la connexion DB avant d'écraser
    await db.$disconnect();

    // Restaurer la base SQLite
    const dbEntry = zip.getEntries().find((e) => e.entryName.startsWith("db/") && e.entryName.endsWith(".db"));
    if (dbEntry) {
      const dbPath = path.join(process.cwd(), "db", "custom.db");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, dbEntry.getData());
    }

    // Restaurer les photos
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const uploadEntries = zip.getEntries().filter((e) => e.entryName.startsWith("uploads/") && !e.isDirectory);
    for (const entry of uploadEntries) {
      const fname = path.basename(entry.entryName);
      fs.writeFileSync(path.join(uploadsDir, fname), entry.getData());
    }

    return NextResponse.json({ success: true, dbRestored: !!dbEntry, photosRestored: uploadEntries.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur restauration" }, { status: 500 });
  }
}
