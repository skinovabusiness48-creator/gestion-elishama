"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  RotateCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wine,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
  salePrice: number;
  photo?: string | null;
  category?: { name: string } | null;
}

interface TopItem {
  name: string;
  quantity: number;
  total: number;
}

interface AlertItem {
  type: "low" | "out";
  message: string;
  productId: string;
}

interface ChartPoint {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface DashboardData {
  today: { revenue: number; expenses: number; profit: number; salesCount: number };
  lowStock: Product[];
  outOfStock: Product[];
  alerts: AlertItem[];
  topDishes: TopItem[];
  topDrinks: TopItem[];
  topProducts: TopItem[];
  chart: ChartPoint[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function navigateTo(module: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: module }));
  }
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

// Classe commune pour styliser les ticks et la grille des graphiques recharts
// (les variables de couleur du thème sont en oklch, on passe donc par les
// utilitaires Tailwind fill-* / stroke-* qui ciblent les bonnes CSS vars).
const CHART_WRAPPER =
  "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 text-xs";

/* ------------------------------------------------------------------ */
/* Tooltip personnalisé                                                */
/* ------------------------------------------------------------------ */

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  color?: string;
  name?: string;
}

function ChartTooltip({ active, payload, label, color, name }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <div className="font-medium text-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-muted-foreground">{name} :</span>
        <span className="font-semibold text-foreground">{formatMoney(value)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carte "Top des ventes" (Plats / Boissons / Produits)                */
/* ------------------------------------------------------------------ */

interface TopListProps {
  title: string;
  icon: React.ReactNode;
  items: TopItem[];
  accent: string;
}

function TopList({ title, icon, items, accent }: TopListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", accent)}>
            {icon}
          </span>
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto font-mono tabular-nums">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Aucune vente aujourd'hui"
            description="Les meilleures ventes du jour apparaîtront ici."
            className="py-6"
          />
        ) : (
          <ul className="scroll-thin max-h-72 space-y-1 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/60"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="truncate font-medium">{item.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    ×{formatNumber(item.quantity)}
                  </Badge>
                  <span className="whitespace-nowrap text-xs font-semibold text-foreground">
                    {formatMoney(item.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Carte graphique générique                                           */
/* ------------------------------------------------------------------ */

interface ChartCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={CHART_WRAPPER}>
          <ResponsiveContainer width="100%" height={260}>
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Module principal                                                    */
/* ------------------------------------------------------------------ */

export function DashboardModule() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const result = await apiFetch<DashboardData>("/api/dashboard");
      setData(result);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger le tableau de bord",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = data?.today;
  const profit = today?.profit ?? 0;
  const profitPositive = profit >= 0;
  const profitTone: "success" | "danger" = profitPositive ? "success" : "danger";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aujourd'hui"
        description="Synthèse des ventes, dépenses et alertes du jour"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => navigateTo("sales")}>
              <Plus className="h-4 w-4" />
              Nouvelle vente
            </Button>
          </>
        }
      />

      {/* ---------------- KPIs du jour ---------------- */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Chiffre d'affaires"
            value={formatMoney(today?.revenue ?? 0)}
            icon={<Receipt className="h-5 w-5" />}
            tone="primary"
            hint="Recettes du jour"
          />
          <StatCard
            label="Dépenses"
            value={formatMoney(today?.expenses ?? 0)}
            icon={<Wallet className="h-5 w-5" />}
            tone="warning"
            hint="Sorties du jour"
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
            tone={profitTone}
            hint={profitPositive ? "Excédent du jour" : "Perte du jour"}
          />
          <StatCard
            label="Nombre de ventes"
            value={formatNumber(today?.salesCount ?? 0)}
            icon={<ShoppingCart className="h-5 w-5" />}
            tone="default"
            hint="Transactions du jour"
          />
        </div>
      )}

      {/* ---------------- Graphiques 7 jours ---------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading || !data ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))
        ) : (
          <>
            <ChartCard
              title="Ventes par jour"
              description="Chiffre d'affaires sur 7 jours"
            >
              <AreaChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <Tooltip content={<ChartTooltip color="var(--chart-1)" name="Revenus" />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                />
              </AreaChart>
            </ChartCard>

            <ChartCard
              title="Dépenses par jour"
              description="Sorties d'argent sur 7 jours"
            >
              <BarChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <Tooltip
                  content={<ChartTooltip color="var(--chart-2)" name="Dépenses" />}
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                />
                <Bar dataKey="expenses" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard
              title="Bénéfice par jour"
              description="Revenus - Dépenses sur 7 jours"
            >
              <LineChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <Tooltip content={<ChartTooltip color="var(--chart-3)" name="Bénéfice" />} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-3)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartCard>
          </>
        )}
      </div>

      {/* ---------------- Top des ventes du jour ---------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {loading || !data ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))
        ) : (
          <>
            <TopList
              title="Top plats"
              icon={<UtensilsCrossed className="h-4 w-4" />}
              items={data.topDishes}
              accent="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            />
            <TopList
              title="Top boissons"
              icon={<Wine className="h-4 w-4" />}
              items={data.topDrinks}
              accent="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
            />
            <TopList
              title="Top produits"
              icon={<Package className="h-4 w-4" />}
              items={data.topProducts}
              accent="bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
            />
          </>
        )}
      </div>

      {/* ---------------- Alertes & stock faible ---------------- */}
      {loading || !data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertes &amp; stock faible
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {data.lowStock.length} stock faible
                </Badge>
                <Badge variant="destructive" className="gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  {data.outOfStock.length} épuisé{data.outOfStock.length > 1 ? "s" : ""}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => navigateTo("products")}>
                  Voir les produits
                </Button>
              </div>
            </div>
            <CardDescription>
              Cliquez sur une alerte pour accéder au produit concerné
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <EmptyState
                title="Aucune alerte"
                description="Tous vos produits ont un stock suffisant. Bonne gestion !"
                icon={<AlertTriangle className="h-6 w-6 text-emerald-500" />}
                className="py-8"
              />
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.alerts.map((alert) => {
                  const isOut = alert.type === "out";
                  return (
                    <li key={`${alert.type}-${alert.productId}`}>
                      <button
                        type="button"
                        onClick={() => navigateTo("products")}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                          isOut
                            ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
                            : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            isOut
                              ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                              : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                          )}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{alert.message}</span>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isOut
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {isOut ? "Épuisé" : "Stock faible"}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
