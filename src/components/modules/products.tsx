"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  History,
  MoreHorizontal,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PhotoUpload } from "@/components/shared/PhotoUpload";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { apiFetch, photoUrl } from "@/lib/api";
import { cn, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  category: Category | null;
  photo: string | null;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minStock: number;
  unit: string;
  description: string | null;
  available: boolean;
  internalCode: string | null;
  createdAt: string;
}

interface StockEntry {
  id: string;
  date: string;
  productName: string;
  supplierName: string | null;
  quantity: number;
  unitPrice: number;
  observation: string | null;
}

interface ProductDetail extends Product {
  stockEntries: StockEntry[];
}

interface ProductFormValues {
  name: string;
  internalCode: string;
  categoryId: string; // "" = aucune
  photo: string | null;
  purchasePrice: string;
  salePrice: string;
  quantity: string;
  minStock: string;
  unit: string;
  description: string;
  available: boolean;
}

const NO_CATEGORY = "__none__";

function emptyForm(): ProductFormValues {
  return {
    name: "",
    internalCode: "",
    categoryId: "",
    photo: null,
    purchasePrice: "0",
    salePrice: "0",
    quantity: "0",
    minStock: "0",
    unit: "unité",
    description: "",
    available: true,
  };
}

function productToForm(p: Product): ProductFormValues {
  return {
    name: p.name,
    internalCode: p.internalCode ?? "",
    categoryId: p.categoryId ?? "",
    photo: p.photo,
    purchasePrice: String(p.purchasePrice ?? 0),
    salePrice: String(p.salePrice ?? 0),
    quantity: String(p.quantity ?? 0),
    minStock: String(p.minStock ?? 0),
    unit: p.unit || "unité",
    description: p.description ?? "",
    available: p.available,
  };
}

function navigateTo(moduleId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: moduleId }));
  }
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export function ProductsModule() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [categoryId, setCategoryId] = useState<string>(""); // "" = toutes
  const [availability, setAvailability] = useState<"all" | "true" | "false">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [search, setSearch] = useState("");

  // Formulaire (création / édition / duplication)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Historique
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyDetail, setHistoryDetail] = useState<ProductDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Suppression (dialogue contrôlé hors du menu d'actions)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------------------- Chargement données ---------------------- */

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      if (availability !== "all") params.set("available", availability);
      if (stockFilter === "low") params.set("lowStock", "1");
      if (stockFilter === "out") params.set("outOfStock", "1");
      const qs = params.toString();
      const data = await apiFetch<Product[]>(`/api/products${qs ? `?${qs}` : ""}`);
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  }, [categoryId, availability, stockFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiFetch<Category[]>("/api/categories");
      setCategories(data);
    } catch {
      // silencieux : le select sera juste vide
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------- Recherche locale ------------------------ */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.internalCode ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  /* ---------------------- Compteurs filtres ----------------------- */

  const stats = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const p of items) {
      if (p.quantity <= 0) out += 1;
      else if (p.minStock > 0 && p.quantity <= p.minStock) low += 1;
    }
    return { low, out, total: items.length };
  }, [items]);

  /* ---------------------- Formulaire ------------------------------ */

  function openCreate() {
    setEditing(null);
    setDuplicating(false);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setDuplicating(false);
    setForm(productToForm(p));
    setDialogOpen(true);
  }

  function openDuplicate(p: Product) {
    setEditing(null);
    setDuplicating(true);
    setForm(productToForm(p));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        internalCode: form.internalCode.trim() || null,
        categoryId: form.categoryId && form.categoryId !== NO_CATEGORY ? form.categoryId : null,
        photo: form.photo || null,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        quantity: Number(form.quantity) || 0,
        minStock: Number(form.minStock) || 0,
        unit: form.unit.trim() || "unité",
        description: form.description.trim() || null,
        available: form.available,
      };
      if (editing) {
        await apiFetch(`/api/products/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Produit mis à jour");
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(duplicating ? "Produit dupliqué" : "Produit créé");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    try {
      await apiFetch(`/api/products/${p.id}`, { method: "DELETE" });
      toast.success("Produit supprimé");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
      throw err;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await handleDelete(deleteTarget);
    } catch {
      // erreur déjà notifiée par toast
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------------- Historique ------------------------------ */

  async function openHistory(p: Product) {
    setHistoryProduct(p);
    setHistoryDetail(null);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const detail = await apiFetch<ProductDetail>(`/api/products/${p.id}`);
      setHistoryDetail(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger l'historique");
    } finally {
      setHistoryLoading(false);
    }
  }

  /* ---------------------- Rendu ----------------------------------- */

  const dialogTitle = duplicating
    ? "Dupliquer le produit"
    : editing
      ? "Modifier le produit"
      : "Nouveau produit";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description="Gérez votre stock et vos produits"
        icon={<Package className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau produit
          </Button>
        }
      />

      {/* ---------------- Barre de filtres ---------------- */}
      <Card className="py-4">
        <CardContent className="flex flex-col gap-3 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou code..."
                className="pl-8"
              />
            </div>

            <Select
              value={categoryId || "all"}
              onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji ? `${c.emoji} ` : ""}{c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={availability}
              onValueChange={(v: "all" | "true" | "false") => setAvailability(v)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Disponibilité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                <SelectItem value="true">Disponibles</SelectItem>
                <SelectItem value="false">Indisponibles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stock :
            </span>
            <button
              type="button"
              onClick={() => setStockFilter((s) => (s === "low" ? "all" : "low"))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                stockFilter === "low"
                  ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              Stock faible
              <Badge variant="secondary" className="ml-1 font-mono tabular-nums">{stats.low}</Badge>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter((s) => (s === "out" ? "all" : "out"))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                stockFilter === "out"
                  ? "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              Épuisé
              <Badge variant="secondary" className="ml-1 font-mono tabular-nums">{stats.out}</Badge>
            </button>
            {(stockFilter !== "all" || categoryId || availability !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setStockFilter("all");
                  setCategoryId("");
                  setAvailability("all");
                  setSearch("");
                }}
              >
                Réinitialiser
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} produit{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Table ---------------- */}
      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun produit"
          description={
            items.length === 0
              ? "Ajoutez votre premier produit pour commencer à gérer votre stock."
              : "Aucun produit ne correspond aux filtres sélectionnés."
          }
          icon={<PackageSearch className="h-6 w-6" />}
          action={
            items.length === 0 ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nouveau produit
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="py-0">
          <div className="scroll-thin max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-b">
                  <TableHead className="min-w-[60px] pl-4">Photo</TableHead>
                  <TableHead className="min-w-[180px]">Nom</TableHead>
                  <TableHead className="min-w-[140px]">Catégorie</TableHead>
                  <TableHead className="min-w-[110px] text-right">Prix achat</TableHead>
                  <TableHead className="min-w-[110px] text-right">Prix vente</TableHead>
                  <TableHead className="min-w-[120px] text-right">Stock</TableHead>
                  <TableHead className="min-w-[90px]">Dispo</TableHead>
                  <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const out = p.quantity <= 0;
                  const low = !out && p.minStock > 0 && p.quantity <= p.minStock;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {p.photo ? (
                            <img
                              src={photoUrl(p.photo)}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          {p.internalCode && (
                            <div className="truncate text-xs text-muted-foreground">
                              Code : {p.internalCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.category ? (
                          <Badge variant="secondary" className="gap-1">
                            {p.category.emoji && <span aria-hidden>{p.category.emoji}</span>}
                            {p.category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Aucune</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatMoney(p.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatMoney(p.salePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono tabular-nums text-xs font-medium",
                            out
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : low
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                          )}
                        >
                          {out && <AlertTriangle className="h-3 w-3" />}
                          {formatNumber(p.quantity)} {p.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.available ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Oui
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Non</Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDuplicate(p)}>
                              <Copy className="h-4 w-4" />
                              Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openHistory(p)}>
                              <History className="h-4 w-4" />
                              Historique
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ---------------- Dialogue formulaire ---------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto scroll-thin sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <PhotoUpload
              value={form.photo}
              onChange={(path) => setForm((f) => ({ ...f, photo: path }))}
              label="Photo du produit"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prod-name">Nom *</Label>
                <Input
                  id="prod-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : Coca-Cola 1L"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-code">Code interne</Label>
                <Input
                  id="prod-code"
                  value={form.internalCode}
                  onChange={(e) => setForm((f) => ({ ...f, internalCode: e.target.value }))}
                  placeholder="Ex : BOI-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-cat">Catégorie</Label>
                <Select
                  value={form.categoryId || NO_CATEGORY}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoryId: v === NO_CATEGORY ? "" : v }))
                  }
                >
                  <SelectTrigger id="prod-cat" className="w-full">
                    <SelectValue placeholder="Aucune catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Aucune catégorie</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.emoji ? `${c.emoji} ` : ""}{c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-purchase">Prix d&apos;achat (FCFA)</Label>
                <Input
                  id="prod-purchase"
                  type="number"
                  min="0"
                  step="any"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-sale">Prix de vente (FCFA)</Label>
                <Input
                  id="prod-sale"
                  type="number"
                  min="0"
                  step="any"
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-qty">Quantité actuelle</Label>
                <Input
                  id="prod-qty"
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-min">Stock minimum</Label>
                <Input
                  id="prod-min"
                  type="number"
                  min="0"
                  step="any"
                  value={form.minStock}
                  onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-unit">Unité</Label>
                <Input
                  id="prod-unit"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="Ex : unité, L, kg, bouteille..."
                />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                <div>
                  <Label htmlFor="prod-available" className="cursor-pointer">
                    Disponible à la vente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Indisponible si le produit est momentanément retiré du catalogue.
                  </p>
                </div>
                <Switch
                  id="prod-available"
                  checked={form.available}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prod-desc">Description</Label>
                <Textarea
                  id="prod-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description optionnelle"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {editing ? "Enregistrer" : duplicating ? "Dupliquer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Dialogue historique ---------------- */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historique du stock
            </DialogTitle>
            <DialogDescription>
              {historyProduct && (
                <>
                  <span className="font-medium text-foreground">{historyProduct.name}</span>
                  {" — "}entrées de stock enregistrées
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : historyDetail && historyDetail.stockEntries.length > 0 ? (
            <div className="scroll-thin max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {historyDetail.stockEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatNumber(entry.quantity)} {historyDetail.unit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.date)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        Fournisseur :{" "}
                        <span className="text-foreground">
                          {entry.supplierName || "—"}
                        </span>
                      </span>
                      <span>
                        Prix unitaire :{" "}
                        <span className="font-medium text-foreground">
                          {formatMoney(entry.unitPrice)}
                        </span>
                      </span>
                      <span>
                        Total :{" "}
                        <span className="font-medium text-foreground">
                          {formatMoney(entry.unitPrice * entry.quantity)}
                        </span>
                      </span>
                    </div>
                    {entry.observation && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        « {entry.observation} »
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucune entrée de stock"
              description="Les réapprovisionnements de ce produit apparaîtront ici."
              icon={<History className="h-6 w-6" />}
              className="py-6"
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setHistoryOpen(false);
                navigateTo("stock");
              }}
            >
              <Plus className="h-4 w-4" />
              Ajouter une entrée
            </Button>
            <Button type="button" onClick={() => setHistoryOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Dialogue suppression ---------------- */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Voulez-vous vraiment supprimer « {deleteTarget.name} » ? Cette action est
                  irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
