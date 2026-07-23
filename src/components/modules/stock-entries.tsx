"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { downloadCSV, downloadExcel } from "@/lib/export";
import {
  cn,
  formatDateTime,
  formatMoney,
  formatNumber,
  isSameDay,
  toInputDateTime,
} from "@/lib/utils";

/* ----------------------------- Types ----------------------------- */

interface ProductLite {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface SupplierLite {
  id: string;
  name: string;
}

interface StockEntry {
  id: string;
  date: string;
  productId: string | null;
  product: ProductLite | null;
  productName: string;
  supplierId: string | null;
  supplier: SupplierLite | null;
  supplierName: string | null;
  quantity: number;
  unitPrice: number;
  observation: string | null;
  createdAt: string;
}

interface FormState {
  date: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: string;
  unitPrice: string;
  observation: string;
}

const MANUAL = "__manual__";
const ALL = "all";

function emptyForm(): FormState {
  return {
    date: toInputDateTime(new Date()),
    productId: "",
    productName: "",
    supplierId: "",
    supplierName: "",
    quantity: "",
    unitPrice: "",
    observation: "",
  };
}

const EXPORT_HEADERS = [
  "Date",
  "Produit",
  "Fournisseur",
  "Quantité",
  "Prix unitaire",
  "Total",
  "Observation",
];

/* ----------------------------- Module ----------------------------- */

export function StockEntriesModule() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [filterProductId, setFilterProductId] = useState<string>("");
  const [filterSupplierId, setFilterSupplierId] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  // Dialogue formulaire
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Dialogue suppression contrôlé
  const [toDelete, setToDelete] = useState<StockEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const [data, prods, sups] = await Promise.all([
        apiFetch<StockEntry[]>("/api/stock-entries"),
        apiFetch<ProductLite[]>("/api/products"),
        apiFetch<SupplierLite[]>("/api/suppliers"),
      ]);
      setEntries(data);
      setProducts(prods);
      setSuppliers(sups);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger les entrées de stock",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ----- KPIs (basés sur toutes les entrées, sans filtre) ----- */
  const todayEntries = useMemo(
    () => entries.filter((e) => isSameDay(e.date, new Date())),
    [entries],
  );
  const todayQty = todayEntries.reduce((s, e) => s + (e.quantity || 0), 0);
  const todayValue = todayEntries.reduce(
    (s, e) => s + (e.quantity || 0) * (e.unitPrice || 0),
    0,
  );
  const totalCount = entries.length;

  /* ----- Liste filtrée pour le tableau ----- */
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterProductId && e.productId !== filterProductId) return false;
      if (filterSupplierId && e.supplierId !== filterSupplierId) return false;
      if (filterFrom && new Date(e.date) < new Date(`${filterFrom}T00:00:00`)) return false;
      if (filterTo && new Date(e.date) > new Date(`${filterTo}T23:59:59`)) return false;
      return true;
    });
  }, [entries, filterProductId, filterSupplierId, filterFrom, filterTo]);

  const hasFilters = !!(filterProductId || filterSupplierId || filterFrom || filterTo);

  /* ----- Formulaire ----- */
  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(entry: StockEntry) {
    setEditing(entry);
    setForm({
      date: toInputDateTime(entry.date),
      productId: entry.productId || "",
      productName: entry.productName || "",
      supplierId: entry.supplierId || "",
      supplierName: entry.supplierName || "",
      quantity: String(entry.quantity ?? ""),
      unitPrice: String(entry.unitPrice ?? ""),
      observation: entry.observation || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.productName.trim()) {
      toast.error("Le produit est requis");
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La quantité doit être positive");
      return;
    }
    const payload = {
      date: new Date(form.date).toISOString(),
      productId: form.productId || null,
      productName: form.productName.trim(),
      supplierId: form.supplierId || null,
      supplierName: form.supplierName.trim() || null,
      quantity,
      unitPrice: Number(form.unitPrice) || 0,
      observation: form.observation.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/stock-entries/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Entrée de stock mise à jour");
      } else {
        await apiFetch("/api/stock-entries", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Entrée de stock enregistrée");
      }
      setDialogOpen(false);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/stock-entries/${toDelete.id}`, { method: "DELETE" });
      toast.success("Entrée supprimée");
      setToDelete(null);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  function resetFilters() {
    setFilterProductId("");
    setFilterSupplierId("");
    setFilterFrom("");
    setFilterTo("");
  }

  /* ----- Export ----- */
  function exportRows(): (string | number)[][] {
    return filtered.map((e) => [
      formatDateTime(e.date),
      e.productName,
      e.supplierName || "",
      e.quantity,
      e.unitPrice,
      (e.quantity || 0) * (e.unitPrice || 0),
      e.observation || "",
    ]);
  }

  function handleExportCSV() {
    if (filtered.length === 0) {
      toast.error("Aucune entrée à exporter");
      return;
    }
    downloadCSV("entrees-stock", EXPORT_HEADERS, exportRows());
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      toast.error("Aucune entrée à exporter");
      return;
    }
    downloadExcel("entrees-stock", "Entrées de stock", EXPORT_HEADERS, exportRows());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entrées de stock"
        description="Suivez les réapprovisionnements de vos produits"
        icon={<PackagePlus className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
              <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4" />
                  Exporter en CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Exporter en Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle entrée
            </Button>
          </>
        }
      />

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
            label="Entrées aujourd'hui"
            value={formatNumber(todayEntries.length)}
            hint={`${formatNumber(todayQty)} unités reçues`}
            icon={<PackagePlus className="h-5 w-5" />}
            tone="primary"
          />
          <StatCard
            label="Valeur du jour"
            value={formatMoney(todayValue)}
            hint="Quantité × prix unitaire"
            icon={<Calendar className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="Total entrées"
            value={formatNumber(totalCount)}
            hint="Toutes périodes confondues"
            icon={<Package className="h-5 w-5" />}
            tone="default"
          />
        </div>
      )}

      {/* ---------------- Section Aujourd'hui ---------------- */}
      {!loading && todayEntries.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Calendar className="h-4 w-4" />
              </span>
              Aujourd'hui
              <Badge variant="secondary" className="ml-auto font-mono tabular-nums">
                {todayEntries.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {todayEntries.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-background/70 px-3 py-2.5 text-sm"
                >
                  <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400">
                    +{formatNumber(e.quantity)} {e.product?.unit || ""}
                  </Badge>
                  <span className="font-medium">{e.productName}</span>
                  {e.supplierName && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      {e.supplierName}
                    </span>
                  )}
                  <span className="ml-auto font-semibold tabular-nums">
                    {formatMoney(e.unitPrice)}
                  </span>
                  {e.observation && (
                    <span className="w-full text-xs text-muted-foreground line-clamp-1">
                      {e.observation}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ---------------- Filtres ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span>Filtrer les entrées</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Produit</Label>
              <Select
                value={filterProductId || ALL}
                onValueChange={(v) => setFilterProductId(v === ALL ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les produits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous les produits</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fournisseur</Label>
              <Select
                value={filterSupplierId || ALL}
                onValueChange={(v) => setFilterSupplierId(v === ALL ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les fournisseurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous les fournisseurs</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Du</Label>
              <Input
                type="date"
                value={filterFrom}
                max={filterTo || undefined}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Au</Label>
              <Input
                type="date"
                value={filterTo}
                min={filterFrom || undefined}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Tableau ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span>Historique des entrées</span>
            <Badge variant="secondary" className="font-mono tabular-nums">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Aucune entrée de stock"
              description="Enregistrez votre premier réapprovisionnement."
              icon={<PackagePlus className="h-6 w-6" />}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Nouvelle entrée
                </Button>
              }
              className="mx-4 mb-4"
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="min-w-[140px]">Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="min-w-[180px]">Observation</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(e.date)}
                      </TableCell>
                      <TableCell className="font-medium">{e.productName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.supplierName || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400"
                        >
                          +{formatNumber(e.quantity)} {e.product?.unit || ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(e.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney((e.quantity || 0) * (e.unitPrice || 0))}
                      </TableCell>
                      <TableCell
                        className="max-w-[240px] truncate text-sm text-muted-foreground"
                        title={e.observation || ""}
                      >
                        {e.observation || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(e)}>
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setToDelete(e)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Dialogue formulaire ---------------- */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto scroll-thin max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l'entrée" : "Nouvelle entrée de stock"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Ajustez les informations de cette entrée. Le stock du produit sera mis à jour."
                : "Renseignez le produit réapprovisionné et son prix d'achat."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="se-date">Date et heure</Label>
                <Input
                  id="se-date"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              {/* Produit */}
              <div className="space-y-1.5">
                <Label htmlFor="se-product-select">Produit existant</Label>
                <Select
                  value={form.productId || MANUAL}
                  onValueChange={(v) => {
                    if (v === MANUAL) {
                      setForm((f) => ({ ...f, productId: "" }));
                    } else {
                      const p = products.find((x) => x.id === v);
                      setForm((f) => ({
                        ...f,
                        productId: v,
                        productName: p ? p.name : f.productName,
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="se-product-select" className="w-full">
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MANUAL}>✏️ Saisie manuelle</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        <span className="text-muted-foreground">
                          {" "}
                          ({formatNumber(p.quantity)} {p.unit})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="se-product-name">
                  Nom du produit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="se-product-name"
                  value={form.productName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productName: e.target.value, productId: "" }))
                  }
                  placeholder="Ex : Farine de blé"
                  required
                />
              </div>

              {/* Fournisseur */}
              <div className="space-y-1.5">
                <Label htmlFor="se-supplier-select">Fournisseur existant</Label>
                <Select
                  value={form.supplierId || MANUAL}
                  onValueChange={(v) => {
                    if (v === MANUAL) {
                      setForm((f) => ({ ...f, supplierId: "" }));
                    } else {
                      const s = suppliers.find((x) => x.id === v);
                      setForm((f) => ({
                        ...f,
                        supplierId: v,
                        supplierName: s ? s.name : f.supplierName,
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="se-supplier-select" className="w-full">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MANUAL}>✏️ Saisie manuelle</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="se-supplier-name">Nom du fournisseur</Label>
                <Input
                  id="se-supplier-name"
                  value={form.supplierName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supplierName: e.target.value, supplierId: "" }))
                  }
                  placeholder="Ex : Distribution SARL"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="se-qty">
                  Quantité <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="se-qty"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="se-price">Prix unitaire (FCFA)</Label>
                <Input
                  id="se-price"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="se-obs">Observation</Label>
                <Textarea
                  id="se-obs"
                  rows={3}
                  value={form.observation}
                  onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
                  placeholder="Notes : facture, lot, qualité…"
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
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Dialogue suppression ---------------- */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `L'entrée « ${toDelete.productName} » (+${formatNumber(
                    toDelete.quantity,
                  )}) sera supprimée et le stock du produit sera décrémenté. Cette action est irréversible.`
                : "Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
