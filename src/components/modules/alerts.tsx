"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Package,
  PackagePlus,
  RotateCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

/* ----------------------------- Types ----------------------------- */

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

interface DashboardData {
  lowStock: Product[];
  outOfStock: Product[];
  alerts: { type: "low" | "out"; message: string; productId: string }[];
  today: { revenue: number; expenses: number; profit: number; salesCount: number };
}

/* ----------------------------- Helpers ----------------------------- */

function navigateToStock() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: "stock" }));
  }
}

function ratioOf(p: Product): number {
  if (p.minStock <= 0) return 0;
  return Math.min(100, Math.round((p.quantity / p.minStock) * 100));
}

/* ----------------------------- Module ----------------------------- */

export function AlertsModule() {
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
        err instanceof Error ? err.message : "Impossible de charger les alertes",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lowStock = data?.lowStock ?? [];
  const outOfStock = data?.outOfStock ?? [];
  const totalAlerts = lowStock.length + outOfStock.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertes"
        description="Stock faible et épuisé"
        icon={<Bell className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </>
      ) : (
        <>
          {/* ---------------- KPIs ---------------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Stock faible"
              value={formatNumber(lowStock.length)}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="warning"
              hint="Produits à réapprovisionner"
            />
            <StatCard
              label="Stock épuisé"
              value={formatNumber(outOfStock.length)}
              icon={<XCircle className="h-5 w-5" />}
              tone="danger"
              hint="Produits en rupture"
            />
          </div>

          {totalAlerts === 0 ? (
            <EmptyState
              title="Aucune alerte"
              description="Tous vos stocks sont au niveau optimal."
              icon={<CheckCircle className="h-6 w-6 text-emerald-500" />}
              className="py-12"
            />
          ) : (
            <>
              {/* ---------------- Stock épuisé ---------------- */}
              {outOfStock.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-100 text-destructive dark:bg-red-950 dark:text-red-400">
                            <XCircle className="h-4 w-4" />
                          </span>
                          Stock épuisé
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          Ces produits ne sont plus disponibles — réapprovisionnez-les en priorité.
                        </CardDescription>
                      </div>
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {outOfStock.length} produit{outOfStock.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {outOfStock.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/30"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-destructive dark:bg-red-950 dark:text-red-400">
                            <Package className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.category?.name || "Sans catégorie"} — Stock :{" "}
                              <span className="font-semibold text-destructive">
                                0 {p.unit}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={navigateToStock}
                            className="shrink-0"
                          >
                            <PackagePlus className="h-4 w-4" />
                            <span className="hidden sm:inline">Réapprovisionner</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* ---------------- Stock faible ---------------- */}
              {lowStock.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                          Stock faible
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          Ces produits approchent de leur seuil minimum de réapprovisionnement.
                        </CardDescription>
                      </div>
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {lowStock.length} produit{lowStock.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {lowStock.map((p) => {
                        const ratio = ratioOf(p);
                        return (
                          <li
                            key={p.id}
                            className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                                <Package className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {p.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {p.category?.name || "Sans catégorie"} —{" "}
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                                    {formatNumber(p.quantity)} / {formatNumber(p.minStock)}{" "}
                                    {p.unit}
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={navigateToStock}
                                className="shrink-0"
                              >
                                <PackagePlus className="h-4 w-4" />
                                <span className="hidden sm:inline">Réapprovisionner</span>
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 pl-12">
                              <Progress
                                value={ratio}
                                className="h-1.5 [&_[data-slot=progress-indicator]]:bg-amber-500"
                              />
                              <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                                {ratio}%
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
