"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Wine,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, photoUrl } from "@/lib/api";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Drink {
  id: string;
  name: string;
  photo?: string | null;
  price: number;
  description?: string | null;
  available: boolean;
  createdAt: string;
}

interface DrinkFormValues {
  name: string;
  photo: string | null;
  price: string;
  description: string;
  available: boolean;
}

const EMPTY_FORM: DrinkFormValues = {
  name: "",
  photo: null,
  price: "",
  description: "",
  available: true,
};

/* ------------------------------------------------------------------ */
/* Carte boisson                                                       */
/* ------------------------------------------------------------------ */

interface DrinkCardProps {
  drink: Drink;
  togglingId: string | null;
  onEdit: (drink: Drink) => void;
  onDelete: (drink: Drink) => void;
  onToggleAvailable: (drink: Drink, available: boolean) => void;
}

function DrinkCard({
  drink,
  togglingId,
  onEdit,
  onDelete,
  onToggleAvailable,
}: DrinkCardProps) {
  const isToggling = togglingId === drink.id;
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square w-full bg-muted">
        {drink.photo ? (
          <img
            src={photoUrl(drink.photo)}
            alt={drink.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <Wine className="h-12 w-12" />
          </div>
        )}
        <Badge
          className={cn(
            "absolute left-2 top-2 gap-1 border-0 shadow-sm",
            drink.available
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              drink.available ? "bg-emerald-500" : "bg-zinc-400",
            )}
          />
          {drink.available ? "Disponible" : "Indisponible"}
        </Badge>
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 shadow-sm"
                aria-label="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(drink)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(drink)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="space-y-2 p-3">
        <h3 className="truncate font-semibold leading-tight" title={drink.name}>
          {drink.name}
        </h3>
        <p className="text-lg font-bold text-primary">
          {formatMoney(drink.price)}
        </p>
        {drink.description ? (
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {drink.description}
          </p>
        ) : (
          <p className="min-h-[2.5rem] text-sm italic text-muted-foreground/50">
            Aucune description
          </p>
        )}
        <div className="flex items-center justify-between border-t pt-2">
          <Label
            htmlFor={`switch-drink-${drink.id}`}
            className="cursor-pointer text-xs text-muted-foreground"
          >
            Disponible
          </Label>
          <Switch
            id={`switch-drink-${drink.id}`}
            checked={drink.available}
            disabled={isToggling}
            onCheckedChange={(checked) => onToggleAvailable(drink, checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogue formulaire (création / édition)                            */
/* ------------------------------------------------------------------ */

interface DrinkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Drink | null;
  onSubmit: (values: DrinkFormValues) => Promise<void>;
}

function DrinkFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: DrinkFormDialogProps) {
  const [values, setValues] = useState<DrinkFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              name: initial.name,
              photo: initial.photo ?? null,
              price: String(initial.price ?? ""),
              description: initial.description ?? "",
              available: initial.available,
            }
          : EMPTY_FORM,
      );
      setErrors({});
    }
  }, [open, initial]);

  function update<K extends keyof DrinkFormValues>(
    key: K,
    value: DrinkFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { name?: string; price?: string } = {};
    if (!values.name.trim()) newErrors.name = "Le nom est requis";
    const priceNum = parseFloat(values.price);
    if (values.price === "" || Number.isNaN(priceNum) || priceNum < 0) {
      newErrors.price = "Prix invalide";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer la boisson",
      );
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la boisson" : "Nouvelle boisson"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de cette boisson."
              : "Ajoutez une nouvelle boisson à la carte du restaurant."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PhotoUpload
            value={values.photo}
            onChange={(p) => update("photo", p)}
            label="Photo de la boisson"
          />
          <div className="space-y-2">
            <Label htmlFor="drink-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="drink-name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="ex: Coca, Fanta"
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="drink-price">
              Prix (FCFA) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="drink-price"
              type="number"
              min="0"
              step="any"
              value={values.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="ex: 500"
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="drink-desc">Description</Label>
            <Textarea
              id="drink-desc"
              rows={3}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Volume, contenance, etc."
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="drink-available" className="cursor-pointer">
                Disponible
              </Label>
              <p className="text-xs text-muted-foreground">
                Afficher cette boisson sur la carte
              </p>
            </div>
            <Switch
              id="drink-available"
              checked={values.available}
              onCheckedChange={(c) => update("available", c)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Module principal                                                    */
/* ------------------------------------------------------------------ */

type AvailabilityFilter = "all" | "available" | "unavailable";

export function DrinksModule() {
  const [items, setItems] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Drink | null>(null);
  const [deleting, setDeleting] = useState<Drink | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [availFilter, setAvailFilter] = useState<AvailabilityFilter>("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Drink[]>("/api/drinks");
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de charger les boissons",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableCount = items.filter((d) => d.available).length;

  const filtered = items.filter((drink) => {
    const matchesSearch =
      search.trim() === "" ||
      drink.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      (drink.description ?? "").toLowerCase().includes(search.trim().toLowerCase());
    const matchesAvail =
      availFilter === "all" ||
      (availFilter === "available" && drink.available) ||
      (availFilter === "unavailable" && !drink.available);
    return matchesSearch && matchesAvail;
  });

  const hasFilters = search.trim() !== "" || availFilter !== "all";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(drink: Drink) {
    setEditing(drink);
    setFormOpen(true);
  }
  function askDelete(drink: Drink) {
    setDeleting(drink);
  }

  async function handleSubmit(values: DrinkFormValues) {
    const payload = {
      name: values.name.trim(),
      photo: values.photo,
      price: parseFloat(values.price),
      description: values.description.trim() || null,
      available: values.available,
    };
    if (editing) {
      await apiFetch(`/api/drinks/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Boisson mise à jour");
    } else {
      await apiFetch("/api/drinks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Boisson ajoutée");
    }
    await load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/drinks/${deleting.id}`, { method: "DELETE" });
      toast.success("Boisson supprimée");
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de supprimer la boisson",
      );
    } finally {
      setDeleting(null);
    }
  }

  async function toggleAvailable(drink: Drink, available: boolean) {
    setTogglingId(drink.id);
    try {
      await apiFetch(`/api/drinks/${drink.id}`, {
        method: "PUT",
        body: JSON.stringify({ available }),
      });
      setItems((prev) =>
        prev.map((d) => (d.id === drink.id ? { ...d, available } : d)),
      );
      toast.success(
        available
          ? "Boisson marquée disponible"
          : "Boisson marquée indisponible",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de modifier la disponibilité",
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boissons"
        description="La carte des boissons"
        icon={<Wine className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle boisson
          </Button>
        }
      />

      {/* Barre de recherche + filtres */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une boisson par nom ou description..."
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={availFilter} onValueChange={(v) => setAvailFilter(v as AvailabilityFilter)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Disponibilité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les boissons</SelectItem>
              <SelectItem value="available">Disponibles</SelectItem>
              <SelectItem value="unavailable">Indisponibles</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setAvailFilter("all");
              }}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      )}

      {/* Statistiques */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Boissons disponibles"
            value={availableCount}
            icon={<Wine className="h-5 w-5" />}
            tone="success"
            hint="Prêtes à être servies"
          />
          <StatCard
            label="Boissons total"
            value={items.length}
            icon={<Wine className="h-5 w-5" />}
            tone="primary"
            hint="Toutes les boissons de la carte"
          />
        </div>
      )}

      {/* Grille des boissons */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Aucun résultat" : "Aucune boisson"}
          description={
            hasFilters
              ? "Aucune boisson ne correspond à votre recherche."
              : "Ajoutez votre première boisson (ex: Coca, Fanta)"
          }
          icon={<Wine className="h-6 w-6" />}
          action={
            hasFilters ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setAvailFilter("all");
                }}
              >
                <X className="h-4 w-4" />
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Ajouter une boisson
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((drink) => (
            <DrinkCard
              key={drink.id}
              drink={drink}
              togglingId={togglingId}
              onEdit={openEdit}
              onDelete={askDelete}
              onToggleAvailable={toggleAvailable}
            />
          ))}
        </div>
      )}

      {/* Dialogue formulaire */}
      <DrinkFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette boisson ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `« ${deleting.name} » sera définitivement supprimée de la carte. Cette action est irréversible.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
