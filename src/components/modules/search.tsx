"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Package,
  PackagePlus,
  Receipt,
  Search,
  UtensilsCrossed,
  Wallet,
  Wine,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { apiFetch, photoUrl } from "@/lib/api";
import { cn, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";

/* ----------------------------- Types ----------------------------- */

interface CategoryLite {
  name: string | null;
}

interface SearchProduct {
  id: string;
  name: string;
  internalCode: string | null;
  salePrice: number;
  purchasePrice: number;
  quantity: number;
  category: CategoryLite | null;
  photo: string | null;
}

interface SearchDish {
  id: string;
  name: string;
  price: number;
  description: string | null;
  available: boolean;
}

interface SearchDrink {
  id: string;
  name: string;
  price: number;
  description: string | null;
  available: boolean;
}

interface SaleItemPreview {
  itemName: string;
  quantity: number;
  total: number;
}

interface SearchSale {
  id: string;
  date: string;
  totalAmount: number;
  note: string | null;
  items: SaleItemPreview[];
}

interface SearchExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  description: string | null;
  category: CategoryLite | null;
  photo: string | null;
}

interface SearchStockEntry {
  id: string;
  date: string;
  productName: string;
  supplierName: string | null;
  quantity: number;
  unitPrice: number;
  observation: string | null;
}

interface SearchResult {
  products: SearchProduct[];
  dishes: SearchDish[];
  drinks: SearchDrink[];
  sales: SearchSale[];
  expenses: SearchExpense[];
  stockEntries: SearchStockEntry[];
}

const EMPTY_RESULT: SearchResult = {
  products: [],
  dishes: [],
  drinks: [],
  sales: [],
  expenses: [],
  stockEntries: [],
};

function navigateTo(moduleId: string) {
  window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: moduleId }));
}

/* ----------------------------- Sous-composants ----------------------------- */

interface GroupSectionProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  badgeClass: string;
  children: React.ReactNode;
}

function GroupSection({ label, count, icon, badgeClass, children }: GroupSectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden py-0 gap-0">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Badge className={cn("gap-1", badgeClass)}>
                {icon}
                {label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {count} résultat{count > 1 ? "s" : ""}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y border-t">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface ResultRowProps {
  onClick: () => void;
  children: React.ReactNode;
}

function ResultRow({ onClick, children }: ResultRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
    >
      {children}
    </button>
  );
}

/* ----------------------------- Module ----------------------------- */

export function SearchModule() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [fetchedQuery, setFetchedQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus au montage
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce ~300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // `loading` est dérivé : vrai tant que la dernière recherche effectuée
  // ne correspond pas à la requête courante (évite tout setState synchrone
  // dans le corps de l'effet).
  const loading = debounced !== "" && fetchedQuery !== debounced;

  // Recherche dès que debounced >= 1 caractère
  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    apiFetch<SearchResult>(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then((data) => {
        if (cancelled) return;
        setResult(data ?? EMPTY_RESULT);
        setFetchedQuery(debounced);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult(EMPTY_RESULT);
        setFetchedQuery(debounced);
        toast.error(err instanceof Error ? err.message : "Erreur lors de la recherche");
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const total = result
    ? result.products.length +
      result.dishes.length +
      result.drinks.length +
      result.sales.length +
      result.expenses.length +
      result.stockEntries.length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recherche"
        description="Recherche instantanée dans toute l'application"
        icon={<Search className="h-5 w-5" />}
      />

      {/* Champ de recherche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit, plat, boisson, vente, dépense..."
          className="h-12 pl-11 pr-10 text-base"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* État initial */}
      {!debounced && (
        <EmptyState
          title="Recherche globale"
          description="Tapez pour rechercher à travers tous vos produits, ventes, dépenses..."
          icon={<Search className="h-6 w-6" />}
        />
      )}

      {/* Chargement (squelettes) — visible à chaque nouvelle recherche */}
      {debounced && loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Aucun résultat */}
      {debounced && !loading && result && total === 0 && (
        <EmptyState
          title={`Aucun résultat pour « ${debounced} »`}
          description="Essayez un autre mot-clé ou vérifiez l'orthographe."
          icon={<Search className="h-6 w-6" />}
        />
      )}

      {/* Résultats groupés */}
      {debounced && !loading && result && total > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} résultat{total > 1 ? "s" : ""} pour «{" "}
            <span className="font-medium text-foreground">{debounced}</span> »
          </p>

          {result.products.length > 0 && (
            <GroupSection
              label="Produits"
              count={result.products.length}
              icon={<Package className="h-3 w-3" />}
              badgeClass="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            >
              {result.products.map((p) => (
                <ResultRow key={p.id} onClick={() => navigateTo("products")}>
                  <div className="flex min-w-0 items-center gap-3">
                    {p.photo ? (
                      <img
                        src={photoUrl(p.photo)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        {p.internalCode && (
                          <span className="hidden sm:inline text-xs text-muted-foreground">
                            #{p.internalCode}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.category?.name || "Sans catégorie"} · Stock{" "}
                        {formatNumber(p.quantity)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-primary">{formatMoney(p.salePrice)}</div>
                  </div>
                </ResultRow>
              ))}
            </GroupSection>
          )}

          {result.dishes.length > 0 && (
            <GroupSection
              label="Plats"
              count={result.dishes.length}
              icon={<UtensilsCrossed className="h-3 w-3" />}
              badgeClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              {result.dishes.map((d) => (
                <ResultRow key={d.id} onClick={() => navigateTo("dishes")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name}</div>
                      {d.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {d.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        d.available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          : "border-border bg-muted text-muted-foreground"
                      }
                    >
                      {d.available ? "Disponible" : "Indisponible"}
                    </Badge>
                    <span className="font-semibold text-primary">{formatMoney(d.price)}</span>
                  </div>
                </ResultRow>
              ))}
            </GroupSection>
          )}

          {result.drinks.length > 0 && (
            <GroupSection
              label="Boissons"
              count={result.drinks.length}
              icon={<Wine className="h-3 w-3" />}
              badgeClass="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            >
              {result.drinks.map((d) => (
                <ResultRow key={d.id} onClick={() => navigateTo("drinks")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Wine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name}</div>
                      {d.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {d.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        d.available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          : "border-border bg-muted text-muted-foreground"
                      }
                    >
                      {d.available ? "Disponible" : "Indisponible"}
                    </Badge>
                    <span className="font-semibold text-primary">{formatMoney(d.price)}</span>
                  </div>
                </ResultRow>
              ))}
            </GroupSection>
          )}

          {result.sales.length > 0 && (
            <GroupSection
              label="Ventes"
              count={result.sales.length}
              icon={<Receipt className="h-3 w-3" />}
              badgeClass="bg-primary/10 text-primary"
            >
              {result.sales.map((s) => (
                <ResultRow key={s.id} onClick={() => navigateTo("sales")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {formatDateTime(s.date)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {s.items.length} article{s.items.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.note || s.items.map((i) => `${i.itemName} ×${i.quantity}`).join(", ") || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-primary">{formatMoney(s.totalAmount)}</div>
                  </div>
                </ResultRow>
              ))}
            </GroupSection>
          )}

          {result.expenses.length > 0 && (
            <GroupSection
              label="Dépenses"
              count={result.expenses.length}
              icon={<Wallet className="h-3 w-3" />}
              badgeClass="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {result.expenses.map((e) => (
                <ResultRow key={e.id} onClick={() => navigateTo("expenses")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{e.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatDateTime(e.date)}
                        {e.category?.name ? ` · ${e.category.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-destructive">{formatMoney(e.amount)}</div>
                  </div>
                </ResultRow>
              ))}
            </GroupSection>
          )}

          {result.stockEntries.length > 0 && (
            <GroupSection
              label="Entrées de stock"
              count={result.stockEntries.length}
              icon={<PackagePlus className="h-3 w-3" />}
              badgeClass="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300"
            >
              {result.stockEntries.map((s) => (
                <ResultRow key={s.id} onClick={() => navigateTo("stock")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300">
                      <PackagePlus className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.productName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatDateTime(s.date)}
                        {s.supplierName ? ` · ${s.supplierName}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="secondary" className="gap-1">
                      +{formatNumber(s.quantity)}
                    </Badge>
                  </div>
                </ResultRow>
              ))}
            </GroupSection>
          )}
        </div>
      )}
    </div>
  );
}
