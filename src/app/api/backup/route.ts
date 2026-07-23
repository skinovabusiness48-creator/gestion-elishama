import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Fermer la connexion pour libérer le fichier SQLite
    await db.$disconnect();

    const zip = new AdmZip();
    const dbPath = path.join(process.cwd(), "db", "custom.db");
    if (fs.existsSync(dbPath)) zip.addLocalFile(dbPath, "db");

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const f of files) {
        zip.addLocalFile(path.join(uploadsDir, f), "uploads");
      }
    }

    // Manifeste
    zip.addFile("manifest.json", Buffer.from(JSON.stringify({ app: "ELISHAMA", version: "1.0.0", date: new Date().toISOString(), dbFiles: 1, uploads: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0 }, null, 2)));

    const dateStr = new Date().toLocaleDateString("fr-FR").replace(/\//g, "_");
    const buffer = zip.toBuffer();
    return new NextResponse(new Uint8Array(buffer) as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Sauvegarde_${dateStr}.zip"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur sauvegarde" }, { status: 500 });
  }
}
