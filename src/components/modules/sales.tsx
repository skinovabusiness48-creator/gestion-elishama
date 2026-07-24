"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileDown,
  FileSpreadsheet,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  Receipt,
  RotateCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wine,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { apiFetch, photoUrl } from "@/lib/api";
import { cn, formatMoney, formatNumber, formatDateTime } from "@/lib/utils";
import { downloadCSV, downloadExcel, downloadPDF } from "@/lib/export";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ItemType = "product" | "dish" | "drink";

interface Product {
  id: string;
  name: string;
  salePrice: number;
  photo?: string | null;
  available?: boolean;
  unit?: string;
  quantity?: number;
}
interface Dish {
  id: string;
  name: string;
  price: number;
  photo?: string | null;
  available?: boolean;
}
interface Drink {
  id: string;
  name: string;
  price: number;
  photo?: string | null;
  available?: boolean;
}
interface SaleItem {
  id: string;
  itemType: ItemType;
  productId: string | null;
  dishId: string | null;
  drinkId: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
interface Sale {
  id: string;
  date: string;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  items: SaleItem[];
}
interface CartItem {
  itemType: ItemType;
  refId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  photo?: string | null;
}

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cartKey(c: CartItem): string {
  return `${c.itemType}:${c.refId}`;
}
function lineTotal(c: CartItem): number {
  return c.quantity * c.unitPrice;
}
function itemCount(s: Sale): number {
  return s.items.length;
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Période personnalisée",
};

/* ------------------------------------------------------------------ */
/* Bouton article (catalogue POS)                                      */
/* ------------------------------------------------------------------ */

interface ItemButtonProps {
  name: string;
  price: number;
  photo?: string | null;
  icon: React.ReactNode;
  hint?: string;
  onClick: () => void;
}

function ItemButton({ name, price, photo, icon, hint, onClick }: ItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {photo ? (
          <img
            src={photoUrl(photo)}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/60">
            {icon}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <div className="line-clamp-2 text-sm font-medium leading-tight">{name}</div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-primary">{formatMoney(price)}</span>
          {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau panier (réutilisé en colonne et dans le Sheet mobile)       */
/* ------------------------------------------------------------------ */

interface CartPanelProps {
  cart: CartItem[];
  note: string;
  submitting: boolean;
  onNoteChange: (v: string) => void;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;
  onPriceChange: (key: string, v: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  variant?: "inline" | "sheet";
}

function CartPanel({
  cart,
  note,
  submitting,
  onNoteChange,
  onInc,
  onDec,
  onRemove,
  onPriceChange,
  onClear,
  onSubmit,
  variant = "inline",
}: CartPanelProps) {
  const total = cart.reduce((s, c) => s + lineTotal(c), 0);
  const totalQty = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Panier
            {cart.length > 0 && (
              <Badge variant="secondary" className="font-mono tabular-nums">
                {formatNumber(totalQty)}
              </Badge>
            )}
          </CardTitle>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vider
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
        {cart.length === 0 ? (
          <EmptyState
            title="Panier vide"
            description="Ajoutez des plats, boissons ou produits pour composer une vente."
            className="flex-1 py-8"
            icon={<ShoppingCart className="h-6 w-6" />}
          />
        ) : (
          <ScrollArea
            className={cn(
              "flex-1 pr-2",
              variant === "inline" ? "max-h-[44vh] lg:max-h-[52vh]" : "max-h-[52vh]",
            )}
          >
            <ul className="space-y-2">
              {cart.map((c) => {
                const k = cartKey(c);
                return (
                  <li key={k} className="rounded-lg border bg-card/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(c.quantity)} × {formatMoney(c.unitPrice)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(k)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-md border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onDec(k)}
                          disabled={c.quantity <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-mono tabular-nums">
                          {formatNumber(c.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onInc(k)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={c.unitPrice}
                        onChange={(e) => onPriceChange(k, Number(e.target.value) || 0)}
                        className="ml-auto h-8 w-28 text-right text-sm tabular-nums"
                        aria-label="Prix unitaire"
                      />
                      <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatMoney(lineTotal(c))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        <div className="space-y-3 border-t pt-3">
          <div>
            <Label htmlFor="sale-note" className="text-xs text-muted-foreground">
              Note (optionnel)
            </Label>
            <Textarea
              id="sale-note"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Client, table, observation…"
              className="mt-1 min-h-[60px] resize-none text-sm"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-xl font-bold tabular-nums text-primary">
              {formatMoney(total)}
            </span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={onSubmit}
            disabled={cart.length === 0 || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4" />
            )}
            Enregistrer la vente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Grille de squelettes (chargement catalogue)                         */
/* ------------------------------------------------------------------ */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet « Nouvelle vente » (caisse / POS)                            */
/* ------------------------------------------------------------------ */

interface POSPanelProps {
  onSaleSaved: () => void;
}

function POSPanel({ onSaleSaved }: POSPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [posTab, setPosTab] = useState<string>("dishes");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const [p, d, dr] = await Promise.all([
        apiFetch<Product[]>("/api/products?available=true"),
        apiFetch<Dish[]>("/api/dishes"),
        apiFetch<Drink[]>("/api/drinks"),
      ]);
      setProducts(p);
      setDishes(d.filter((x) => x.available !== false));
      setDrinks(dr.filter((x) => x.available !== false));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger le catalogue",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredDishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter((d) => d.name.toLowerCase().includes(q));
  }, [dishes, search]);

  const filteredDrinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drinks;
    return drinks.filter((d) => d.name.toLowerCase().includes(q));
  }, [drinks, search]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const k = cartKey(item);
      const idx = prev.findIndex((c) => cartKey(c) === k);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const inc = (key: string) =>
    setCart((prev) =>
      prev.map((c) => (cartKey(c) === key ? { ...c, quantity: c.quantity + 1 } : c)),
    );
  const dec = (key: string) =>
    setCart((prev) =>
      prev.map((c) =>
        cartKey(c) === key ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c,
      ),
    );
  const removeItem = (key: string) =>
    setCart((prev) => prev.filter((c) => cartKey(c) !== key));
  const priceChange = (key: string, v: number) =>
    setCart((prev) =>
      prev.map((c) => (cartKey(c) === key ? { ...c, unitPrice: Math.max(0, v) } : c)),
    );
  const clear = () => {
    setCart([]);
    setNote("");
  };

  const submit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const items = cart.map((c) => {
        const base: Record<string, unknown> = {
          itemType: c.itemType,
          itemName: c.itemName,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          total: lineTotal(c),
        };
        if (c.itemType === "product") base.productId = c.refId;
        else if (c.itemType === "dish") base.dishId = c.refId;
        else base.drinkId = c.refId;
        return base;
      });
      await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify({ note: note.trim() || undefined, items }),
      });
      toast.success("Vente enregistrée avec succès");
      clear();
      setMobileCartOpen(false);
      onSaleSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cartProps: CartPanelProps = {
    cart,
    note,
    submitting,
    onNoteChange: setNote,
    onInc: inc,
    onDec: dec,
    onRemove: removeItem,
    onPriceChange: priceChange,
    onClear: clear,
    onSubmit: submit,
  };

  const totalQty = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Catalogue (colonne gauche) */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Catalogue</CardTitle>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un article…"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={posTab} onValueChange={setPosTab}>
              <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                <TabsTrigger value="dishes">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span className="hidden sm:inline">Plats</span>
                  <Badge variant="secondary" className="ml-1 font-mono">
                    {dishes.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="drinks">
                  <Wine className="h-4 w-4" />
                  <span className="hidden sm:inline">Boissons</span>
                  <Badge variant="secondary" className="ml-1 font-mono">
                    {drinks.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="products">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Produits</span>
                  <Badge variant="secondary" className="ml-1 font-mono">
                    {products.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dishes" className="mt-4">
                {loading ? (
                  <SkeletonGrid />
                ) : filteredDishes.length === 0 ? (
                  <EmptyState
                    title="Aucun plat disponible"
                    description="Ajoutez des plats dans le module Plats ou ajustez votre recherche."
                    icon={<UtensilsCrossed className="h-6 w-6" />}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {filteredDishes.map((d) => (
                      <ItemButton
                        key={d.id}
                        name={d.name}
                        price={d.price}
                        photo={d.photo}
                        icon={<UtensilsCrossed className="h-8 w-8" />}
                        onClick={() =>
                          addToCart({
                            itemType: "dish",
                            refId: d.id,
                            itemName: d.name,
                            quantity: 1,
                            unitPrice: d.price,
                            photo: d.photo,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drinks" className="mt-4">
                {loading ? (
                  <SkeletonGrid />
                ) : filteredDrinks.length === 0 ? (
                  <EmptyState
                    title="Aucune boisson disponible"
                    description="Ajoutez des boissons dans le module Boissons ou ajustez votre recherche."
                    icon={<Wine className="h-6 w-6" />}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {filteredDrinks.map((d) => (
                      <ItemButton
                        key={d.id}
                        name={d.name}
                        price={d.price}
                        photo={d.photo}
                        icon={<Wine className="h-8 w-8" />}
                        onClick={() =>
                          addToCart({
                            itemType: "drink",
                            refId: d.id,
                            itemName: d.name,
                            quantity: 1,
                            unitPrice: d.price,
                            photo: d.photo,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products" className="mt-4">
                {loading ? (
                  <SkeletonGrid />
                ) : filteredProducts.length === 0 ? (
                  <EmptyState
                    title="Aucun produit disponible"
                    description="Ajoutez des produits dans le module Produits ou ajustez votre recherche."
                    icon={<Package className="h-6 w-6" />}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((p) => (
                      <ItemButton
                        key={p.id}
                        name={p.name}
                        price={p.salePrice}
                        photo={p.photo}
                        icon={<Package className="h-8 w-8" />}
                        hint={p.unit ? `en ${p.unit}` : undefined}
                        onClick={() =>
                          addToCart({
                            itemType: "product",
                            refId: p.id,
                            itemName: p.name,
                            quantity: 1,
                            unitPrice: p.salePrice,
                            photo: p.photo,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Panier — colonne droite (desktop) */}
      <div className="hidden lg:col-span-1 lg:block">
        <div className="sticky top-4">
          <CartPanel {...cartProps} />
        </div>
      </div>

      {/* Bouton flottant + Sheet panier (mobile) */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-4 right-4 z-40 h-14 gap-2 rounded-full px-5 shadow-lg lg:hidden"
          >
            <ShoppingCart className="h-5 w-5" />
            Panier
            {totalQty > 0 && (
              <Badge className="bg-background text-primary hover:bg-background">
                {formatNumber(totalQty)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex max-h-[92vh] flex-col gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Panier ({formatNumber(totalQty)})
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            <CartPanel {...cartProps} variant="sheet" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet « Historique »                                               */
/* ------------------------------------------------------------------ */

interface HistoryPanelProps {
  refreshKey: number;
}

function HistoryPanel({ refreshKey }: HistoryPanelProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (period === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      } else {
        params.set("period", period);
      }
      const qs = params.toString();
      const result = await apiFetch<Sale[]>(`/api/sales${qs ? `?${qs}` : ""}`);
      setSales(result);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger l'historique",
      );
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const totalRevenue = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const salesCount = sales.length;
  const avg = salesCount > 0 ? totalRevenue / salesCount : 0;

  const exportRows = (): (string | number)[][] =>
    sales.map((s) => [formatDateTime(s.date), itemCount(s), s.totalAmount]);

  const handleCSV = () => {
    if (sales.length === 0) {
      toast.info("Aucune vente à exporter");
      return;
    }
    downloadCSV("ventes", ["Date", "Articles", "Total (FCFA)"], exportRows());
  };
  const handleExcel = () => {
    if (sales.length === 0) {
      toast.info("Aucune vente à exporter");
      return;
    }
    downloadExcel("ventes", "Ventes", ["Date", "Articles", "Total (FCFA)"], exportRows());
  };
  const handlePDF = () => {
    if (sales.length === 0) {
      toast.info("Aucune vente à exporter");
      return;
    }
    const headers = ["Date", "Articles", "Total (FCFA)"];
    const rows: (string | number)[][] = sales.map((s) => [
      formatDateTime(s.date),
      itemCount(s),
      s.totalAmount,
    ]);
    downloadPDF("ventes", headers, rows, {
      title: "Ventes",
      subtitle: `${PERIOD_LABELS[period]} · ${salesCount} vente${salesCount > 1 ? "s" : ""}`,
      summaryCards: [
        { label: "Revenu total", value: formatMoney(totalRevenue) },
        { label: "Nombre de ventes", value: String(salesCount) },
        { label: "Panier moyen", value: formatMoney(avg) },
      ],
      total: { label: "Total général", value: formatMoney(totalRevenue) },
    });
    toast.success("Export PDF « Ventes » téléchargé");
  };

  return (
    <div className="space-y-4">
      {/* Filtres + exports */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Période</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => load()}
            disabled={loading}
            className="sm:ml-auto"
          >
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Statistiques période */}
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
            icon={<TrendingUp className="h-5 w-5" />}
            tone="primary"
            hint={PERIOD_LABELS[period]}
          />
          <StatCard
            label="Nombre de ventes"
            value={salesCount}
            icon={<ShoppingBag className="h-5 w-5" />}
            tone="default"
            hint={PERIOD_LABELS[period]}
          />
          <StatCard
            label="Panier moyen"
            value={formatMoney(avg)}
            icon={<Wallet className="h-5 w-5" />}
            tone="warning"
            hint={PERIOD_LABELS[period]}
          />
        </div>
      )}

      {/* Liste des ventes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ventes ({sales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <EmptyState
              title="Aucune vente sur cette période"
              description="Changez la période ou enregistrez une nouvelle vente depuis l'onglet « Nouvelle vente »."
              icon={<Receipt className="h-6 w-6" />}
            />
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {sales.map((s) => {
                const count = itemCount(s);
                return (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 rounded-lg border bg-card/50 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatDateTime(s.date)}
                        </span>
                        <Badge variant="secondary" className="font-mono">
                          {count} article{count > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {s.note && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          « {s.note} »
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tabular-nums text-primary">
                        {formatMoney(s.totalAmount)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailSale(s)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Détail</span>
                      </Button>
                      <ConfirmDialog
                        title="Supprimer cette vente ?"
                        description="Le stock des produits vendus sera rétabli. Cette action est irréversible."
                        confirmText="Supprimer"
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </Button>
                        }
                        onConfirm={async () => {
                          try {
                            await apiFetch(`/api/sales/${s.id}`, { method: "DELETE" });
                            toast.success("Vente supprimée. Stock des produits rétabli.");
                            load();
                          } catch (err) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Erreur lors de la suppression",
                            );
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue détail */}
      <Dialog
        open={!!detailSale}
        onOpenChange={(o) => !o && setDetailSale(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Détail de la vente
            </DialogTitle>
            <DialogDescription>
              {detailSale && formatDateTime(detailSale.date)}
            </DialogDescription>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-3">
              {detailSale.note && (
                <div className="rounded-md bg-muted/40 p-2.5 text-sm">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Note
                  </span>
                  <p className="mt-0.5">{detailSale.note}</p>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">P.U.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailSale.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.itemName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(it.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(it.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(it.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-primary">
                        {formatMoney(detailSale.totalAmount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module principal                                                    */
/* ------------------------------------------------------------------ */

export function SalesModule() {
  const [mainTab, setMainTab] = useState<string>("pos");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleSaleSaved = useCallback(() => {
    setHistoryRefreshKey((k) => k + 1);
    setMainTab("history");
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes"
        description="Encaissez les ventes en caisse et consultez l'historique des revenus"
        icon={<Receipt className="h-5 w-5" />}
      />
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="pos">
            <ShoppingCart className="h-4 w-4" />
            Nouvelle vente
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pos" className="mt-4">
          <POSPanel onSaleSaved={handleSaleSaved} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryPanel refreshKey={historyRefreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
