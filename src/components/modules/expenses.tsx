"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  FileDown,
  FileSpreadsheet,
  ImageOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Printer,
  Receipt,
  RotateCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, photoUrl } from "@/lib/api";
import { cn, formatDate, formatMoney, toInputDate } from "@/lib/utils";
import { downloadCSV, downloadExcel, downloadPDF } from "@/lib/export";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string | null;
  _count?: { expenses: number };
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  description: string | null;
  photo: string | null;
  categoryId: string | null;
  category: ExpenseCategory | null;
  createdAt: string;
}

interface ExpenseFormValues {
  name: string;
  amount: string;
  date: string;
  description: string;
  photo: string | null;
  categoryId: string;
}

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

const NO_CATEGORY = "__none__";
const CREATE_CATEGORY = "__create__";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Période personnalisée",
};

function emptyForm(): ExpenseFormValues {
  return {
    name: "",
    amount: "",
    date: toInputDate(new Date()),
    description: "",
    photo: null,
    categoryId: NO_CATEGORY,
  };
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export function ExpensesModule() {
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Formulaire dépense
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormValues>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Mini-dialogue création de catégorie (inline)
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", emoji: "" });
  const [catSaving, setCatSaving] = useState(false);

  // Suppression (contrôlée par état car déclenchée depuis DropdownMenu)
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Visionneuse photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  /* ------------------------- Chargements ------------------------- */

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiFetch<ExpenseCategory[]>("/api/expense-categories");
      setCategories(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de charger les catégories de dépenses",
      );
    }
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (opts?.silent) setRefreshing(true);
        else setLoading(true);
        const params = new URLSearchParams();
        if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
        if (period === "custom") {
          if (from) params.set("from", from);
          if (to) params.set("to", to);
        } else {
          params.set("period", period);
        }
        const qs = params.toString();
        const data = await apiFetch<Expense[]>(`/api/expenses${qs ? `?${qs}` : ""}`);
        setItems(data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Impossible de charger les dépenses",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryFilter, period, from, to],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ------------------------- Statistiques ------------------------ */

  const totalAmount = useMemo(
    () => items.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [items],
  );
  const count = items.length;

  /* ------------------------- Formulaire dépense ------------------ */

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      name: e.name,
      amount: String(e.amount),
      date: toInputDate(e.date),
      description: e.description ?? "",
      photo: e.photo ?? null,
      categoryId: e.categoryId ?? NO_CATEGORY,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Le nom de la dépense est requis");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Le montant doit être un nombre supérieur à 0");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        amount,
        date: form.date,
        description: form.description.trim() || null,
        photo: form.photo ?? null,
        categoryId: form.categoryId === NO_CATEGORY ? null : form.categoryId,
      };
      if (editing) {
        await apiFetch(`/api/expenses/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Dépense modifiée");
      } else {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Dépense enregistrée");
      }
      setDialogOpen(false);
      load();
      loadCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement",
      );
    } finally {
      setSaving(false);
    }
  }

  /* --------------------- Création de catégorie ------------------- */

  function openCreateCategory() {
    setCatForm({ name: "", emoji: "" });
    setCatDialogOpen(true);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = catForm.name.trim();
    if (!name) {
      toast.error("Le nom de la catégorie est requis");
      return;
    }
    setCatSaving(true);
    try {
      const created = await apiFetch<ExpenseCategory>("/api/expense-categories", {
        method: "POST",
        body: JSON.stringify({ name, emoji: catForm.emoji.trim() || null }),
      });
      toast.success("Catégorie créée");
      await loadCategories();
      setForm((f) => ({ ...f, categoryId: created.id }));
      setCatDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création",
      );
    } finally {
      setCatSaving(false);
    }
  }

  /* ------------------------- Suppression ------------------------- */

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/expenses/${toDelete.id}`, { method: "DELETE" });
      toast.success("Dépense supprimée");
      setToDelete(null);
      load();
      loadCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    } finally {
      setDeleting(false);
    }
  }

  /* --------------------------- Exports --------------------------- */

  function exportRows(): (string | number)[][] {
    return items.map((e) => [
      formatDate(e.date),
      e.name,
      e.amount,
      e.category ? `${e.category.emoji ?? ""} ${e.category.name}`.trim() : "",
      e.description ?? "",
    ]);
  }

  const exportHeaders = ["Date", "Libellé", "Montant (FCFA)", "Catégorie", "Description"];

  function handleCSV() {
    if (items.length === 0) {
      toast.info("Aucune dépense à exporter");
      return;
    }
    downloadCSV("depenses", exportHeaders, exportRows());
  }

  function handleExcel() {
    if (items.length === 0) {
      toast.info("Aucune dépense à exporter");
      return;
    }
    downloadExcel("depenses", "Dépenses", exportHeaders, exportRows());
  }

  function handlePDF() {
    if (items.length === 0) {
      toast.info("Aucune dépense à exporter");
      return;
    }
    downloadPDF("depenses", exportHeaders, exportRows(), {
      title: "Dépenses",
      subtitle: `${PERIOD_LABELS[period]} · ${count} dépense${count > 1 ? "s" : ""}`,
      summaryCards: [
        { label: "Total dépenses", value: formatMoney(totalAmount) },
        { label: "Nombre de dépenses", value: String(count) },
        { label: "Période", value: PERIOD_LABELS[period] },
      ],
      total: { label: "Total", value: formatMoney(totalAmount) },
    });
    toast.success("Export PDF « Dépenses » téléchargé");
  }

  /* --------------------------- Render ---------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Suivez toutes vos dépenses"
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load({ silent: true })}
              disabled={refreshing}
            >
              <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle dépense
            </Button>
          </>
        }
      />

      {/* Filtres + exports */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Catégorie</Label>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji ? `${c.emoji} ` : ""}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Période</Label>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as PeriodKey)}
            >
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

      {/* Statistiques période */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Total dépenses"
            value={formatMoney(totalAmount)}
            icon={<Wallet className="h-5 w-5" />}
            tone="warning"
            hint={PERIOD_LABELS[period]}
          />
          <StatCard
            label="Nombre de dépenses"
            value={count}
            icon={<Receipt className="h-5 w-5" />}
            tone="default"
            hint={PERIOD_LABELS[period]}
          />
        </div>
      )}

      {/* Tableau des dépenses */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              className="m-4"
              title="Aucune dépense"
              description="Enregistrez votre première dépense pour suivre vos sorties d'argent."
              icon={<Wallet className="h-6 w-6" />}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Nouvelle dépense
                </Button>
              }
            />
          ) : (
            <div className="max-h-[60vh] overflow-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="w-[160px]">Catégorie</TableHead>
                    <TableHead className="w-[80px] text-center">Facture</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-destructive whitespace-nowrap">
                        −{formatMoney(e.amount)}
                      </TableCell>
                      <TableCell>
                        {e.category ? (
                          <Badge variant="secondary" className="gap-1">
                            {e.category.emoji && <span>{e.category.emoji}</span>}
                            <span className="truncate max-w-[120px]">
                              {e.category.name}
                            </span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {e.photo ? (
                          <button
                            type="button"
                            onClick={() => setPhotoPreview(e.photo)}
                            className="inline-block h-10 w-10 overflow-hidden rounded-md border bg-muted transition hover:ring-2 hover:ring-primary/50"
                            title="Voir la facture"
                          >
                            <img
                              src={photoUrl(e.photo)}
                              alt="Facture"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed text-muted-foreground/50">
                            <ImageOff className="h-4 w-4" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[280px]">
                        {e.description ? (
                          <span
                            className="line-clamp-1 text-sm text-muted-foreground"
                            title={e.description}
                          >
                            {e.description}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setToDelete(e)}
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

      {/* ----------------------- Formulaire dépense ----------------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {editing ? "Modifier la dépense" : "Nouvelle dépense"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Mettez à jour les informations de la dépense."
                : "Renseignez les informations de la dépense."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-name">
                Nom de la dépense <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex. Achat de gaz"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">
                  Montant (FCFA) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Date</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-category">Catégorie</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => {
                  if (v === CREATE_CATEGORY) {
                    openCreateCategory();
                  } else {
                    setForm((f) => ({ ...f, categoryId: v }));
                  }
                }}
              >
                <SelectTrigger id="exp-category">
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Aucune</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji ? `${c.emoji} ` : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                  <DropdownMenuSeparator className="my-1 h-px bg-border" />
                  <SelectItem value={CREATE_CATEGORY}>
                    <span className="flex items-center gap-1 text-primary">
                      <Plus className="h-3.5 w-3.5" />
                      Créer une catégorie…
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <PhotoUpload
              label="Photo de la facture"
              value={form.photo}
              onChange={(p) => setForm((f) => ({ ...f, photo: p }))}
            />

            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">Description (optionnel)</Label>
              <Textarea
                id="exp-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Détails complémentaires…"
                rows={3}
              />
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
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PiggyBank className="h-4 w-4" />
                )}
                {editing ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- Mini-dialogue création catégorie ----------------- */}
      <Dialog
        open={catDialogOpen}
        onOpenChange={(o) => !catSaving && setCatDialogOpen(o)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              Nouvelle catégorie
            </DialogTitle>
            <DialogDescription>
              Créez une catégorie pour organiser vos dépenses.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-emoji">Emoji</Label>
                <Input
                  id="cat-emoji"
                  value={catForm.emoji}
                  onChange={(e) =>
                    setCatForm((s) => ({ ...s, emoji: e.target.value }))
                  }
                  placeholder="🍽️"
                  maxLength={8}
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cat-name"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Ex. Loyer"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCatDialogOpen(false)}
                disabled={catSaving}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={catSaving}>
                {catSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------------- Confirmation suppression ----------------------- */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !deleting && setToDelete(o ? toDelete : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Supprimer cette dépense ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  Vous êtes sur le point de supprimer la dépense{" "}
                  <span className="font-medium text-foreground">
                    « {toDelete.name} »
                  </span>{" "}
                  d&apos;un montant de{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(toDelete.amount)}
                  </span>
                  . Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
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

      {/* ----------------------- Visionneuse photo ----------------------- */}
      <Dialog
        open={!!photoPreview}
        onOpenChange={(o) => !o && setPhotoPreview(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Facture
            </DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <div className="overflow-hidden rounded-lg border bg-muted">
              <img
                src={photoUrl(photoPreview)}
                alt="Facture"
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Petit indicateur visuel période (footer implicite via PageHeader description) */}
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {PERIOD_LABELS[period]}
        {period === "custom" && (from || to) && (
          <span className="ml-1">
            ({from || "…"} → {to || "…"})
          </span>
        )}
      </div>
    </div>
  );
}
