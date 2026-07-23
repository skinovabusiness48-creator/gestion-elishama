"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  FileDown,
  FileSpreadsheet,
  Loader2,
  PiggyBank,
  Printer,
  Receipt,
  RotateCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { downloadCSV, downloadExcel, printHTML } from "@/lib/export";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Sale {
  id: string;
  date: string;
  totalAmount: number;
  note: string | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string | null;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  description: string | null;
  categoryId: string | null;
  category: ExpenseCategory | null;
}

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

interface Movement {
  id: string;
  kind: "in" | "out";
  date: string;
  label: string;
  amount: number;
  note?: string | null;
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Période personnalisée",
};

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export function AccountingModule() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* --------------------------- Chargement --------------------------- */

  const buildQuery = useCallback((): string => {
    const params = new URLSearchParams();
    if (period === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    } else {
      params.set("period", period);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [period, from, to]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (opts?.silent) setRefreshing(true);
        else setLoading(true);
        const q = buildQuery();
        const [s, e] = await Promise.all([
          apiFetch<Sale[]>(`/api/sales${q}`),
          apiFetch<Expense[]>(`/api/expenses${q}`),
        ]);
        setSales(s);
        setExpenses(e);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Impossible de charger les données comptables",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    load();
  }, [load]);

  /* --------------------------- Calculs --------------------------- */

  const totalIn = useMemo(
    () => sales.reduce((s, x) => s + (Number(x.totalAmount) || 0), 0),
    [sales],
  );
  const totalOut = useMemo(
    () => expenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [expenses],
  );
  const profit = totalIn - totalOut;

  const movements: Movement[] = useMemo(() => {
    const ins: Movement[] = sales.map((s) => ({
      id: `in:${s.id}`,
      kind: "in" as const,
      date: s.date,
      label: "Vente",
      amount: s.totalAmount,
      note: s.note,
    }));
    const outs: Movement[] = expenses.map((e) => ({
      id: `out:${e.id}`,
      kind: "out" as const,
      date: e.date,
      label: e.name,
      amount: e.amount,
      note: e.category
        ? `${e.category.emoji ?? ""} ${e.category.name}`.trim()
        : e.description ?? undefined,
    }));
    return [...ins, ...outs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [sales, expenses]);

  const hasData = sales.length > 0 || expenses.length > 0;

  /* --------------------------- Exports --------------------------- */

  function exportRows(): (string | number)[][] {
    return movements.map((m) => [
      m.kind === "in" ? "Entrée" : "Sortie",
      formatDateTime(m.date),
      m.label,
      m.note ?? "",
      m.kind === "in" ? m.amount : -m.amount,
    ]);
  }

  const exportHeaders = [
    "Type",
    "Date",
    "Libellé",
    "Détail",
    "Montant (FCFA)",
  ];

  function handleCSV() {
    if (!hasData) {
      toast.info("Aucun mouvement à exporter sur cette période");
      return;
    }
    downloadCSV("comptabilite", exportHeaders, exportRows());
  }

  function handleExcel() {
    if (!hasData) {
      toast.info("Aucun mouvement à exporter sur cette période");
      return;
    }
    downloadExcel("comptabilite", "Comptabilité", exportHeaders, exportRows());
  }

  function handlePDF() {
    if (!hasData) {
      toast.info("Aucun mouvement à exporter sur cette période");
      return;
    }
    const profitTone = profit >= 0 ? "#059669" : "#dc2626";
    const cards = `
      <div class="grid">
        <div class="card"><div class="l">Entrées</div><div class="v" style="color:#059669">${formatMoney(totalIn)}</div></div>
        <div class="card"><div class="l">Sorties</div><div class="v" style="color:#dc2626">${formatMoney(totalOut)}</div></div>
        <div class="card"><div class="l">Bénéfice</div><div class="v" style="color:${profitTone}">${formatMoney(profit)}</div></div>
      </div>`;
    const rows = movements
      .map(
        (m) =>
          `<tr><td>${m.kind === "in" ? "Entrée" : "Sortie"}</td><td>${formatDateTime(m.date)}</td><td>${escapeHTML(m.label)}</td><td>${escapeHTML(m.note ?? "")}</td><td style="text-align:right; color:${m.kind === "in" ? "#059669" : "#dc2626"}; font-weight:600">${m.kind === "in" ? "+" : "−"}${formatMoney(m.amount)}</td></tr>`,
      )
      .join("");
    const table = `
      <table>
        <thead><tr><th>Type</th><th>Date</th><th>Libellé</th><th>Détail</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="total"><td colspan="4">Bénéfice net</td><td style="text-align:right; color:${profitTone}">${formatMoney(profit)}</td></tr>
        </tbody>
      </table>`;
    printHTML(`Comptabilité — ${PERIOD_LABELS[period]}`, cards + table);
  }

  /* --------------------------- Render ---------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptabilité"
        description="Entrées, sorties et bénéfice"
        icon={<Calculator className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => load({ silent: true })}
            disabled={refreshing}
          >
            <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Sélecteur de période */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Période</Label>
            <Tabs
              value={period}
              onValueChange={(v) => setPeriod(v as PeriodKey)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                <TabsTrigger value="today">Auj.</TabsTrigger>
                <TabsTrigger value="week">Semaine</TabsTrigger>
                <TabsTrigger value="month">Mois</TabsTrigger>
                <TabsTrigger value="year">Année</TabsTrigger>
                <TabsTrigger value="custom">Perso.</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {period === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Du</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-[170px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Au</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-[170px]"
                />
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={handleCSV}>
              <FileDown className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDF}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* StatCards : Entrées / Sorties / Bénéfice */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Entrées"
            value={formatMoney(totalIn)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="success"
            hint={`${sales.length} vente${sales.length > 1 ? "s" : ""} · ${PERIOD_LABELS[period]}`}
          />
          <StatCard
            label="Sorties"
            value={formatMoney(totalOut)}
            icon={<TrendingDown className="h-5 w-5" />}
            tone="danger"
            hint={`${expenses.length} dépense${expenses.length > 1 ? "s" : ""} · ${PERIOD_LABELS[period]}`}
          />
          <StatCard
            label="Bénéfice"
            value={formatMoney(profit)}
            icon={<PiggyBank className="h-5 w-5" />}
            tone={profit >= 0 ? "success" : "danger"}
            hint={profit >= 0 ? "Excédent" : "Déficit"}
          />
        </div>
      )}

      {/* Tableau des mouvements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Mouvements
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {movements.length} mouvement{movements.length > 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !hasData ? (
            <EmptyState
              className="m-4"
              title="Aucun mouvement sur cette période"
              description="Les ventes enregistrées et les dépenses apparaîtront ici automatiquement."
              icon={<Wallet className="h-6 w-6" />}
            />
          ) : (
            <div className="max-h-[60vh] overflow-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[160px]">Date</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.kind === "in" ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            Entrée
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300">
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                            Sortie
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(m.date)}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.label}</p>
                          {m.note && (
                            <p className="truncate text-xs text-muted-foreground">
                              {m.note}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums whitespace-nowrap",
                          m.kind === "in"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive",
                        )}
                      >
                        {m.kind === "in" ? "+" : "−"}
                        {formatMoney(m.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé visuel (mobile-friendly) */}
      {!loading && hasData && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Synthèse {PERIOD_LABELS[period]}
                </p>
                <p className="text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(totalIn)}
                  </span>{" "}
                  <span className="text-muted-foreground">·</span>{" "}
                  <span className="text-destructive">
                    −{formatMoney(totalOut)}
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bénéfice net
              </p>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  profit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {formatMoney(profit)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay si rafraîchissement silencieux */}
      {refreshing && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs shadow-md backdrop-blur">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Actualisation…
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utils locaux                                                        */
/* ------------------------------------------------------------------ */

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
