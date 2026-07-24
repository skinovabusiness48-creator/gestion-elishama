"use client";

import { useState } from "react";
import {
  Calculator,
  Calendar,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  PackagePlus,
  Receipt,
  Sheet,
  UtensilsCrossed,
  Wallet,
  Wine,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadExcel, downloadPDF } from "@/lib/export";

/* ----------------------------- Types & config ----------------------------- */

type ExportType =
  | "sales"
  | "expenses"
  | "products"
  | "stock-entries"
  | "dishes"
  | "drinks"
  | "accounting";

interface ExportCardConfig {
  type: ExportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  dateRangeRelevant: boolean;
}

const EXPORTS: ExportCardConfig[] = [
  {
    type: "sales",
    title: "Ventes",
    description: "Historique des ventes avec articles et montants.",
    icon: <Receipt className="h-5 w-5" />,
    dateRangeRelevant: true,
  },
  {
    type: "expenses",
    title: "Dépenses",
    description: "Toutes les dépenses avec catégorie et montant.",
    icon: <Wallet className="h-5 w-5" />,
    dateRangeRelevant: true,
  },
  {
    type: "products",
    title: "Produits",
    description: "Inventaire complet avec prix et stock.",
    icon: <Package className="h-5 w-5" />,
    dateRangeRelevant: false,
  },
  {
    type: "stock-entries",
    title: "Entrées de stock",
    description: "Réapprovisionnements et fournisseurs.",
    icon: <PackagePlus className="h-5 w-5" />,
    dateRangeRelevant: true,
  },
  {
    type: "dishes",
    title: "Plats",
    description: "Carte des plats avec prix et disponibilité.",
    icon: <UtensilsCrossed className="h-5 w-5" />,
    dateRangeRelevant: false,
  },
  {
    type: "drinks",
    title: "Boissons",
    description: "Carte des boissons avec prix et disponibilité.",
    icon: <Wine className="h-5 w-5" />,
    dateRangeRelevant: false,
  },
  {
    type: "accounting",
    title: "Comptabilité",
    description: "Entrées et sorties d'argent consolidées.",
    icon: <Calculator className="h-5 w-5" />,
    dateRangeRelevant: true,
  },
];

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/* ----------------------------- Helpers ----------------------------- */

/** Parse un CSV textuel (avec BOM, guillemets et champs échappés) en headers + rows. */
function parseCSV(text: string): ParsedCSV {
  const cleaned = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = cleaned.length;

  while (i < len) {
    const c = cleaned[i];
    if (inQuotes) {
      if (c === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      current.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r" || c === "\n") {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      if (c === "\r" && cleaned[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += c;
    i++;
  }
  // Dernier champ / dernière ligne
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  // Retire une éventuelle ligne vide finale
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop();
  }
  if (rows.length === 0) return { headers: [], rows: [] };
  return { headers: rows[0], rows: rows.slice(1) };
}

/** Convertit une cellule en nombre si elle est numérique, sinon la renvoie telle quelle. */
function toNumeric(value: string): string | number {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(normalized)) return n;
  return value;
}

function buildExportURL(type: ExportType, from: string, to: string): string {
  const params = new URLSearchParams();
  params.set("type", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/export?${params.toString()}`;
}

function fileBase(type: ExportType): string {
  switch (type) {
    case "sales":
      return "ventes";
    case "expenses":
      return "depenses";
    case "products":
      return "produits";
    case "stock-entries":
      return "entrees_stock";
    case "dishes":
      return "plats";
    case "drinks":
      return "boissons";
    case "accounting":
      return "comptabilite";
  }
}

function titleFor(type: ExportType): string {
  switch (type) {
    case "sales":
      return "Ventes";
    case "expenses":
      return "Dépenses";
    case "products":
      return "Produits";
    case "stock-entries":
      return "Entrées de stock";
    case "dishes":
      return "Plats";
    case "drinks":
      return "Boissons";
    case "accounting":
      return "Comptabilité";
  }
}

/** Calcule un total général si pertinent pour le type (sinon renvoie null). */
function totalForCSV(
  type: ExportType,
  headers: string[],
  rows: string[][],
): { label: string; value: number } | null {
  const findCol = (names: string[]): number => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  let col = -1;
  let label = "";
  if (type === "sales") {
    col = findCol(["Montant total"]);
    label = "Total ventes";
  } else if (type === "expenses") {
    col = findCol(["Montant"]);
    label = "Total dépenses";
  } else if (type === "stock-entries") {
    col = findCol(["Total"]);
    label = "Valeur totale";
  } else if (type === "accounting") {
    col = findCol(["Montant"]);
    label = "Solde net";
  }
  if (col < 0) return null;
  const sum = rows.reduce((acc, r) => {
    const v = Number(String(r[col] ?? "").replace(/\s/g, "").replace(",", "."));
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
  return { label, value: sum };
}

/* ----------------------------- Module ----------------------------- */

export function ExportModule() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  function setBusyKey(key: string, value: boolean) {
    setBusy((b) => ({ ...b, [key]: value }));
  }

  async function fetchCSV(type: ExportType): Promise<ParsedCSV> {
    const res = await fetch(buildExportURL(type, from, to));
    if (!res.ok) {
      let msg = "Erreur lors du téléchargement des données";
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) msg = data.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const text = await res.text();
    return parseCSV(text);
  }

  function exportCSV(type: ExportType) {
    const key = `${type}-csv`;
    if (busy[key]) return;
    setBusyKey(key, true);
    try {
      window.location.href = buildExportURL(type, from, to);
      toast.success(`Export CSV « ${titleFor(type)} » téléchargé`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur export CSV");
    } finally {
      setTimeout(() => setBusyKey(key, false), 800);
    }
  }

  async function exportExcel(type: ExportType) {
    const key = `${type}-excel`;
    if (busy[key]) return;
    setBusyKey(key, true);
    try {
      const parsed = await fetchCSV(type);
      if (parsed.rows.length === 0) {
        toast.error("Aucune donnée à exporter pour cette période");
        return;
      }
      const rows = parsed.rows.map((r) => r.map(toNumeric));
      downloadExcel(fileBase(type), titleFor(type), parsed.headers, rows);
      toast.success(`Export Excel « ${titleFor(type)} » généré`, {
        description: `${parsed.rows.length} ligne(s) exportée(s).`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur export Excel");
    } finally {
      setBusyKey(key, false);
    }
  }

  async function exportPDF(type: ExportType) {
    const key = `${type}-pdf`;
    if (busy[key]) return;
    setBusyKey(key, true);
    try {
      const parsed = await fetchCSV(type);
      if (parsed.rows.length === 0) {
        toast.error("Aucune donnée à exporter pour cette période");
        return;
      }
      const rows = parsed.rows.map((r) => r.map(toNumeric));
      const total = totalForCSV(type, parsed.headers, parsed.rows);
      const dateRangeText =
        from || to
          ? `Période : ${from || "…"} → ${to || "…"}`
          : "Période : toutes les dates";
      downloadPDF(fileBase(type), parsed.headers, rows, {
        title: `${titleFor(type)} — Export`,
        subtitle: `${dateRangeText} · ${parsed.rows.length} ligne(s)`,
        total: total
          ? {
              label: total.label,
              value: `${total.value.toLocaleString("fr-FR")} FCFA`,
            }
          : undefined,
      });
      toast.success(`Export PDF « ${titleFor(type)} » téléchargé`, {
        description: `${parsed.rows.length} ligne(s) exportée(s).`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur export PDF");
    } finally {
      setBusyKey(key, false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        description="Exportez vos données en PDF, Excel ou CSV"
        icon={<FileDown className="h-5 w-5" />}
      />

      {/* Filtre plage de dates optionnelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Période (optionnelle)
          </CardTitle>
          <CardDescription>
            S&apos;applique aux ventes, dépenses, entrées de stock et comptabilité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-from">Date de début</Label>
              <Input
                id="exp-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-to">Date de fin</Label>
              <Input
                id="exp-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille de cards d'export */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.map((cfg) => {
          const csvBusy = !!busy[`${cfg.type}-csv`];
          const excelBusy = !!busy[`${cfg.type}-excel`];
          const pdfBusy = !!busy[`${cfg.type}-pdf`];
          const rangeActive = cfg.dateRangeRelevant && (from || to);
          return (
            <Card key={cfg.type} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {cfg.icon}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{cfg.title}</CardTitle>
                    <CardDescription className="mt-1">{cfg.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                {rangeActive && (
                  <p className="text-xs text-muted-foreground">
                    Période : <span className="font-medium text-foreground">{from || "…"}</span>{" "}
                    → <span className="font-medium text-foreground">{to || "…"}</span>
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    disabled={pdfBusy}
                    onClick={() => exportPDF(cfg.type)}
                    className="gap-1"
                  >
                    {pdfBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={excelBusy}
                    onClick={() => exportExcel(cfg.type)}
                    className="gap-1"
                  >
                    {excelBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={csvBusy}
                    onClick={() => exportCSV(cfg.type)}
                    className="gap-1"
                  >
                    {csvBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sheet className="h-4 w-4" />
                    )}
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Les exports PDF, Excel et CSV sont téléchargés directement sur votre
        appareil.
      </p>
    </div>
  );
}
