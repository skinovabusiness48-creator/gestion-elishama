"use client";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

// Téléchargement PDF réel (.pdf) via jsPDF — génère un fichier téléchargeable
export interface PDFOptions {
  title: string;
  subtitle?: string;
  total?: { label: string; value: string }; // ligne de total général à la fin du tableau
  summaryCards?: { label: string; value: string }[]; // cartes KPI en haut
}

export function downloadPDF(filename: string, headers: string[], rows: (string | number)[][], options: PDFOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // En-tête ELISHAMA
  doc.setFillColor(249, 115, 22); // orange
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ELISHAMA", 14, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Restaurant", 14, 15.5);
  // Date à droite
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("fr-FR"), pageWidth - 14, 11, { align: "right" });

  // Titre du document
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, 14, 28);

  // Sous-titre (période / nombre de lignes)
  if (options.subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(options.subtitle, 14, 34);
  }

  // Cartes KPI résumé (si fournies)
  let startY = options.subtitle ? 40 : 34;
  if (options.summaryCards && options.summaryCards.length > 0) {
    const cardCount = options.summaryCards.length;
    const cardWidth = (pageWidth - 28 - (cardCount - 1) * 6) / cardCount;
    const cardHeight = 16;
    options.summaryCards.forEach((card, i) => {
      const x = 14 + i * (cardWidth + 6);
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.text(card.label.toUpperCase(), x + 3, startY + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(249, 115, 22);
      doc.text(card.value, x + 3, startY + 12);
    });
    startY += cardHeight + 6;
  }

  // Tableau de données
  const tableRows = rows.map((r) => r.map((c) => String(c ?? "")));
  // Ligne de total
  if (options.total) {
    const totalRow: string[] = [];
    for (let i = 0; i < headers.length - 1; i++) totalRow.push("");
    totalRow.push(options.total.label);
    totalRow.push(options.total.value);
    // Si le tableau a moins de colonnes que prévu, on ajuste
    while (totalRow.length < headers.length) totalRow.unshift("");
    tableRows.push(totalRow);
  }

  autoTable(doc, {
    head: [headers.map((h) => String(h))],
    body: tableRows,
    startY,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 247, 244] },
    didParseCell: (data) => {
      // Mettre en gras la dernière ligne si c'est le total
      if (options.total && data.row.index === tableRows.length - 1 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [255, 247, 237];
        data.cell.styles.textColor = [249, 115, 22];
      }
    },
  });

  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `ELISHAMA — Gestion de Restaurant · Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// Ouvre la boîte d'impression du navigateur (conservé pour compatibilité, mais downloadPDF est préféré)
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
