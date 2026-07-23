"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Loader2,
  Receipt,
  RotateCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import {
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  toInputDate,
} from "@/lib/utils";
import { toast } from "sonner";

/* ----------------------------- Types ----------------------------- */

interface TopItem {
  name: string;
  type: string;
  quantity: number;
  total: number;
}

interface TopExpense {
  name: string;
  amount: number;
  category: string;
  date: string;
}

interface ByTypeEntry {
  quantity: number;
  total: number;
}

interface StatsData {
  period: { from: string; to: string };
  topSold: TopItem[];
  leastSold: TopItem[];
  topRevenue: TopItem[];
  topExpenses: TopExpense[];
  byType: { dish: ByTypeEntry; drink: ByTypeEntry; product: ByTypeEntry };
  totalRevenue: number;
  totalExpenses: number;
  totalSales: number;
}

interface PieSlice {
  name: string;
  value: number;
  color: string;
}

/* ----------------------------- Helpers ----------------------------- */

function initialRange(): { from: string; to: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { from: toInputDate(start), to: toInputDate(end) };
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function truncate(value: string, max = 16): string {
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  dish: {
    label: "Plat",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  },
  drink: {
    label: "Boisson",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  product: {
    label: "Produit",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  },
};

function TypeBadge({ type }: { type: string }) {
  const entry = TYPE_BADGES[type] ?? {
    label: type || "—",
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="secondary" className={entry.className}>
      {entry.label}
    </Badge>
  );
}

// Wrapper appliquant le style des ticks/grille recharts (variables oklch du thème).
const CHART_WRAPPER =
  "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 text-xs";

/* ----------------------------- Tooltip personnalisé ----------------------------- */

interface TooltipPayloadItem {
  value?: number | string | Array<number | string>;
  name?: string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatter?: (v: number) => string;
  color?: string;
  name?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter = formatMoney,
  color,
  name,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const value = Number(item.value ?? 0);
  const displayLabel = label ?? item.name;
  const dotColor = color ?? item.color ?? "var(--chart-1)";
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <div className="font-medium text-foreground">{displayLabel}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-muted-foreground">{name ?? item.name} :</span>
        <span className="font-semibold text-foreground">
          {formatter(value)}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------- Carte graphique générique ----------------------------- */

interface ChartCardProps {
  title: string;
  description: string;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactElement;
}

function ChartCard({
  title,
  description,
  isEmpty,
  emptyTitle = "Aucune donnée",
  emptyDescription,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            title={emptyTitle}
            description={
              emptyDescription ??
              "Aucune donnée à afficher sur la période sélectionnée."
            }
            className="py-8"
          />
        ) : (
          <div className={CHART_WRAPPER}>
            <ResponsiveContainer width="100%" height={260}>
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Carte liste (top items) ----------------------------- */

interface ListCardProps {
  title: string;
  description: string;
  items: TopItem[];
}

function ListCard({ title, description, items }: ListCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="font-mono tabular-nums">
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Aucune vente"
            description="Aucune vente enregistrée sur la période sélectionnée."
            className="py-6"
          />
        ) : (
          <div className="scroll-thin max-h-80 overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 text-xs">Article</TableHead>
                  <TableHead className="h-9 text-xs">Type</TableHead>
                  <TableHead className="h-9 text-right text-xs">Qté</TableHead>
                  <TableHead className="h-9 text-right text-xs">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={`${item.name}-${idx}`}>
                    <TableCell className="max-w-[180px] truncate py-2 text-sm font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell className="py-2">
                      <TypeBadge type={item.type} />
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm tabular-nums">
                      {formatNumber(item.quantity)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2 text-right text-sm font-semibold">
                      {formatMoney(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Carte liste (dépenses) ----------------------------- */

interface ExpenseListCardProps {
  title: string;
  description: string;
  items: TopExpense[];
}

function ExpenseListCard({ title, description, items }: ExpenseListCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="font-mono tabular-nums">
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Aucune dépense"
            description="Aucune dépense enregistrée sur la période sélectionnée."
            className="py-6"
          />
        ) : (
          <div className="scroll-thin max-h-80 overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 text-xs">Libellé</TableHead>
                  <TableHead className="h-9 text-xs">Catégorie</TableHead>
                  <TableHead className="h-9 text-right text-xs">Montant</TableHead>
                  <TableHead className="h-9 text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={`${item.name}-${idx}`}>
                    <TableCell className="max-w-[160px] truncate py-2 text-sm font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="font-normal">
                        {item.category || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2 text-right text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {formatMoney(item.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2 text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Module ----------------------------- */

export function StatsModule() {
  const initial = useMemo(initialRange, []);
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (f: string, t: string, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const params = new URLSearchParams({ from: f, to: t });
      const result = await apiFetch<StatsData>(`/api/stats?${params.toString()}`);
      setData(result);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger les statistiques",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(from, to);
  }, [load, from, to]);

  function handleApply() {
    if (fromInput > toInput) {
      toast.error("La date de début doit être antérieure à la date de fin");
      return;
    }
    setFrom(fromInput);
    setTo(toInput);
  }

  function handleReset() {
    const r = initialRange();
    setFromInput(r.from);
    setToInput(r.to);
    setFrom(r.from);
    setTo(r.to);
  }

  const pieData = useMemo<PieSlice[]>(() => {
    if (!data) return [];
    return [
      { name: "Plats", value: data.byType.dish.total, color: "var(--chart-1)" },
      { name: "Boissons", value: data.byType.drink.total, color: "var(--chart-2)" },
      { name: "Produits", value: data.byType.product.total, color: "var(--chart-3)" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const profit = totalRevenue - totalExpenses;
  const profitPositive = profit >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques"
        description="Analyse des performances"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(from, to, true)}
            disabled={refreshing}
          >
            <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* ---------------- Filtre période ---------------- */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="stats-from" className="text-xs text-muted-foreground">
                  Du
                </Label>
                <Input
                  id="stats-from"
                  type="date"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  max={toInput || toInputDate(new Date())}
                  className="w-44"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stats-to" className="text-xs text-muted-foreground">
                  Au
                </Label>
                <Input
                  id="stats-to"
                  type="date"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  min={fromInput}
                  max={toInputDate(new Date())}
                  className="w-44"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                30 derniers jours
              </Button>
              <Button size="sm" onClick={handleApply} disabled={loading || refreshing}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                Analyser
              </Button>
            </div>
          </div>
          {data && (
            <p className="mt-3 text-xs text-muted-foreground">
              Période analysée : du{" "}
              <span className="font-medium text-foreground">
                {formatDate(data.period.from)}
              </span>{" "}
              au{" "}
              <span className="font-medium text-foreground">
                {formatDate(data.period.to)}
              </span>{" "}
              — {formatNumber(data.totalSales)} vente
              {data.totalSales > 1 ? "s" : ""} sur la période
            </p>
          )}
        </CardContent>
      </Card>

      {/* ---------------- KPIs ---------------- */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Revenu total"
            value={formatMoney(totalRevenue)}
            icon={<Receipt className="h-5 w-5" />}
            tone="primary"
            hint="Recettes sur la période"
          />
          <StatCard
            label="Dépenses totales"
            value={formatMoney(totalExpenses)}
            icon={<Wallet className="h-5 w-5" />}
            tone="warning"
            hint="Sorties d'argent"
          />
          <StatCard
            label="Bénéfice"
            value={formatMoney(profit)}
            icon={
              profitPositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )
            }
            tone={profitPositive ? "success" : "danger"}
            hint={profitPositive ? "Excédent" : "Perte"}
          />
        </div>
      )}

      {/* ---------------- Graphiques ---------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading || !data ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))
        ) : (
          <>
            <ChartCard
              title="Top 10 des ventes"
              description="Par quantité vendue"
              isEmpty={data.topSold.length === 0}
              emptyTitle="Aucune vente"
              emptyDescription="Aucune vente enregistrée sur la période."
            >
              <BarChart
                layout="vertical"
                data={data.topSold}
                margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => truncate(v, 18)}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={formatNumber}
                      name="Quantité"
                      color="var(--chart-1)"
                    />
                  }
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                />
                <Bar
                  dataKey="quantity"
                  fill="var(--chart-1)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartCard>

            <ChartCard
              title="Répartition par type"
              description="Revenus : Plats / Boissons / Produits"
              isEmpty={pieData.length === 0}
              emptyTitle="Aucune donnée"
              emptyDescription="Aucun revenu enregistré sur la période."
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={formatMoney} />} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ChartCard>

            <ChartCard
              title="Top dépenses"
              description="Montants les plus élevés"
              isEmpty={data.topExpenses.length === 0}
              emptyTitle="Aucune dépense"
              emptyDescription="Aucune dépense enregistrée sur la période."
            >
              <BarChart
                data={data.topExpenses}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => truncate(v, 10)}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={formatMoney}
                      name="Montant"
                      color="var(--chart-2)"
                    />
                  }
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--chart-2)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartCard>
          </>
        )}
      </div>

      {/* ---------------- Listes ---------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))
        ) : (
          <>
            <ListCard
              title="Les plus vendus"
              description="Par quantité décroissante"
              items={data.topSold}
            />
            <ListCard
              title="Les moins vendus"
              description="Par quantité croissante"
              items={data.leastSold}
            />
            <ListCard
              title="Ce qui rapporte le plus"
              description="Par chiffre d'affaires"
              items={data.topRevenue}
            />
            <ExpenseListCard
              title="Dépenses les plus importantes"
              description="Top 10 des sorties d'argent"
              items={data.topExpenses}
            />
          </>
        )}
      </div>
    </div>
  );
}
