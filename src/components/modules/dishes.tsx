"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  UtensilsCrossed,
  Trash2,
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

interface Dish {
  id: string;
  name: string;
  photo?: string | null;
  price: number;
  description?: string | null;
  available: boolean;
  createdAt: string;
}

interface DishFormValues {
  name: string;
  photo: string | null;
  price: string;
  description: string;
  available: boolean;
}

const EMPTY_FORM: DishFormValues = {
  name: "",
  photo: null,
  price: "",
  description: "",
  available: true,
};

/* ------------------------------------------------------------------ */
/* Carte plat                                                          */
/* ------------------------------------------------------------------ */

interface DishCardProps {
  dish: Dish;
  togglingId: string | null;
  onEdit: (dish: Dish) => void;
  onDelete: (dish: Dish) => void;
  onToggleAvailable: (dish: Dish, available: boolean) => void;
}

function DishCard({
  dish,
  togglingId,
  onEdit,
  onDelete,
  onToggleAvailable,
}: DishCardProps) {
  const isToggling = togglingId === dish.id;
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square w-full bg-muted">
        {dish.photo ? (
          <img
            src={photoUrl(dish.photo)}
            alt={dish.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <UtensilsCrossed className="h-12 w-12" />
          </div>
        )}
        <Badge
          className={cn(
            "absolute left-2 top-2 gap-1 border-0 shadow-sm",
            dish.available
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              dish.available ? "bg-emerald-500" : "bg-zinc-400",
            )}
          />
          {dish.available ? "Disponible" : "Indisponible"}
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
              <DropdownMenuItem onClick={() => onEdit(dish)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(dish)}
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
        <h3 className="truncate font-semibold leading-tight" title={dish.name}>
          {dish.name}
        </h3>
        <p className="text-lg font-bold text-primary">
          {formatMoney(dish.price)}
        </p>
        {dish.description ? (
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {dish.description}
          </p>
        ) : (
          <p className="min-h-[2.5rem] text-sm italic text-muted-foreground/50">
            Aucune description
          </p>
        )}
        <div className="flex items-center justify-between border-t pt-2">
          <Label
            htmlFor={`switch-dish-${dish.id}`}
            className="cursor-pointer text-xs text-muted-foreground"
          >
            Disponible
          </Label>
          <Switch
            id={`switch-dish-${dish.id}`}
            checked={dish.available}
            disabled={isToggling}
            onCheckedChange={(checked) => onToggleAvailable(dish, checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogue formulaire (création / édition)                            */
/* ------------------------------------------------------------------ */

interface DishFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Dish | null;
  onSubmit: (values: DishFormValues) => Promise<void>;
}

function DishFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: DishFormDialogProps) {
  const [values, setValues] = useState<DishFormValues>(EMPTY_FORM);
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

  function update<K extends keyof DishFormValues>(
    key: K,
    value: DishFormValues[K],
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
        err instanceof Error ? err.message : "Impossible d'enregistrer le plat",
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
          <DialogTitle>{isEdit ? "Modifier le plat" : "Nouveau plat"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de ce plat."
              : "Ajoutez un nouveau plat à la carte du restaurant."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PhotoUpload
            value={values.photo}
            onChange={(p) => update("photo", p)}
            label="Photo du plat"
          />
          <div className="space-y-2">
            <Label htmlFor="dish-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dish-name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="ex: Kedjenou poulet"
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dish-price">
              Prix (FCFA) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dish-price"
              type="number"
              min="0"
              step="any"
              value={values.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="ex: 2500"
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dish-desc">Description</Label>
            <Textarea
              id="dish-desc"
              rows={3}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Ingrédients, accompagnement, etc."
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="dish-available" className="cursor-pointer">
                Disponible
              </Label>
              <p className="text-xs text-muted-foreground">
                Afficher ce plat sur la carte
              </p>
            </div>
            <Switch
              id="dish-available"
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

export function DishesModule() {
  const [items, setItems] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [deleting, setDeleting] = useState<Dish | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [availFilter, setAvailFilter] = useState<AvailabilityFilter>("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Dish[]>("/api/dishes");
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger les plats",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableCount = items.filter((d) => d.available).length;

  const filtered = items.filter((dish) => {
    const matchesSearch =
      search.trim() === "" ||
      dish.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      (dish.description ?? "").toLowerCase().includes(search.trim().toLowerCase());
    const matchesAvail =
      availFilter === "all" ||
      (availFilter === "available" && dish.available) ||
      (availFilter === "unavailable" && !dish.available);
    return matchesSearch && matchesAvail;
  });

  const hasFilters = search.trim() !== "" || availFilter !== "all";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(dish: Dish) {
    setEditing(dish);
    setFormOpen(true);
  }

  function askDelete(dish: Dish) {
    setDeleting(dish);
  }

  async function handleSubmit(values: DishFormValues) {
    const payload = {
      name: values.name.trim(),
      photo: values.photo,
      price: parseFloat(values.price),
      description: values.description.trim() || null,
      available: values.available,
    };
    if (editing) {
      await apiFetch(`/api/dishes/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Plat mis à jour");
    } else {
      await apiFetch("/api/dishes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Plat ajouté");
    }
    await load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/dishes/${deleting.id}`, { method: "DELETE" });
      toast.success("Plat supprimé");
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de supprimer le plat",
      );
    } finally {
      setDeleting(null);
    }
  }

  async function toggleAvailable(dish: Dish, available: boolean) {
    setTogglingId(dish.id);
    try {
      await apiFetch(`/api/dishes/${dish.id}`, {
        method: "PUT",
        body: JSON.stringify({ available }),
      });
      setItems((prev) =>
        prev.map((d) => (d.id === dish.id ? { ...d, available } : d)),
      );
      toast.success(
        available ? "Plat marqué disponible" : "Plat marqué indisponible",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de modifier la disponibilité",
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plats"
        description="La carte des plats du restaurant"
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau plat
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
              placeholder="Rechercher un plat par nom ou description..."
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
              <SelectItem value="all">Tous les plats</SelectItem>
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
            label="Plats disponibles"
            value={availableCount}
            icon={<UtensilsCrossed className="h-5 w-5" />}
            tone="success"
            hint="Prêts à être servis"
          />
          <StatCard
            label="Plats total"
            value={items.length}
            icon={<UtensilsCrossed className="h-5 w-5" />}
            tone="primary"
            hint="Tous les plats de la carte"
          />
        </div>
      )}

      {/* Grille des plats */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Aucun résultat" : "Aucun plat"}
          description={
            hasFilters
              ? "Aucun plat ne correspond à votre recherche."
              : "Ajoutez votre premier plat (ex: Kedjenou poulet)"
          }
          icon={<UtensilsCrossed className="h-6 w-6" />}
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
                Ajouter un plat
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              togglingId={togglingId}
              onEdit={openEdit}
              onDelete={askDelete}
              onToggleAvailable={toggleAvailable}
            />
          ))}
        </div>
      )}

      {/* Dialogue formulaire */}
      <DishFormDialog
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
            <AlertDialogTitle>Supprimer ce plat ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `« ${deleting.name} » sera définitivement supprimé de la carte. Cette action est irréversible.`
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
