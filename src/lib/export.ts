"use client";

import * as XLSX from "xlsx";

// Téléchargement CSV (généré côté client)
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

// Téléchargement Excel (.xlsx) via SheetJS
export function downloadExcel(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Feuille1");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

// Export PDF via impression du navigateur (HTML -> Print -> Save as PDF)
export function printHTML(title: string, bodyHTML: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("Veuillez autoriser les popups pour l'impression");
    return;
  }
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; color: #1a1a1a; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #666; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e5e5e5; padding: 8px 10px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) td { background: #fafafa; }
    .total { font-weight: 700; background: #fff7ed !important; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; }
    .card .l { font-size: 11px; color: #666; text-transform: uppercase; }
    .card .v { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 22px; font-weight: 800; color: #f97316; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style></head><body>
  <div class="header"><div><div class="brand">ELISHAMA</div><div class="sub">Restaurant</div></div><div class="sub" style="text-align:right">${new Date().toLocaleString("fr-FR")}</div></div>
  <h1>${title}</h1>
  ${bodyHTML}
  <div class="no-print" style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#f97316;color:white;border:none;padding:10px 20px;border-radius:6px;font-size:14px;cursor:pointer">Imprimer / Enregistrer en PDF</button></div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
