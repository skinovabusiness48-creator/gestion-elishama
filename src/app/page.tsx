"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderTree,
  Package,
  PackagePlus,
  Truck,
  UtensilsCrossed,
  Wine,
  Receipt,
  Wallet,
  Calculator,
  BarChart3,
  MessageSquareWarning,
  Search,
  Bell,
  FileDown,
  DatabaseBackup,
  Menu,
  Sun,
  Moon,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/components/shared/theme-provider";

import { DashboardModule } from "@/components/modules/dashboard";
import { CategoriesModule } from "@/components/modules/categories";
import { ProductsModule } from "@/components/modules/products";
import { StockEntriesModule } from "@/components/modules/stock-entries";
import { SuppliersModule } from "@/components/modules/suppliers";
import { DishesModule } from "@/components/modules/dishes";
import { DrinksModule } from "@/components/modules/drinks";
import { SalesModule } from "@/components/modules/sales";
import { ExpensesModule } from "@/components/modules/expenses";
import { AccountingModule } from "@/components/modules/accounting";
import { StatsModule } from "@/components/modules/stats";
import { FeedbackModule } from "@/components/modules/feedback";
import { SearchModule } from "@/components/modules/search";
import { AlertsModule } from "@/components/modules/alerts";
import { ExportModule } from "@/components/modules/export";
import { BackupModule } from "@/components/modules/backup";

type ModuleId =
  | "dashboard"
  | "categories"
  | "products"
  | "stock"
  | "suppliers"
  | "dishes"
  | "drinks"
  | "sales"
  | "expenses"
  | "accounting"
  | "stats"
  | "feedback"
  | "search"
  | "alerts"
  | "export"
  | "backup";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Pilotage",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "alerts", label: "Alertes", icon: <Bell className="h-4 w-4" /> },
      { id: "search", label: "Recherche", icon: <Search className="h-4 w-4" /> },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { id: "categories", label: "Catégories", icon: <FolderTree className="h-4 w-4" /> },
      { id: "products", label: "Produits", icon: <Package className="h-4 w-4" /> },
      { id: "dishes", label: "Plats", icon: <UtensilsCrossed className="h-4 w-4" /> },
      { id: "drinks", label: "Boissons", icon: <Wine className="h-4 w-4" /> },
    ],
  },
  {
    title: "Stock & Achats",
    items: [
      { id: "stock", label: "Entrées de stock", icon: <PackagePlus className="h-4 w-4" /> },
      { id: "suppliers", label: "Fournisseurs", icon: <Truck className="h-4 w-4" /> },
    ],
  },
  {
    title: "Finances",
    items: [
      { id: "sales", label: "Ventes / Revenus", icon: <Receipt className="h-4 w-4" /> },
      { id: "expenses", label: "Dépenses", icon: <Wallet className="h-4 w-4" /> },
      { id: "accounting", label: "Comptabilité", icon: <Calculator className="h-4 w-4" /> },
      { id: "stats", label: "Statistiques", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Clients & Données",
    items: [
      { id: "feedback", label: "Avis clients", icon: <MessageSquareWarning className="h-4 w-4" /> },
      { id: "export", label: "Export", icon: <FileDown className="h-4 w-4" /> },
      { id: "backup", label: "Sauvegarde", icon: <DatabaseBackup className="h-4 w-4" /> },
    ],
  },
];

const TITLES: Record<ModuleId, { title: string; description: string }> = {
  dashboard: { title: "Tableau de bord", description: "Vue d'ensemble de l'activité du jour" },
  categories: { title: "Catégories", description: "Organisez vos produits par catégories" },
  products: { title: "Produits", description: "Gérez votre stock et vos produits" },
  stock: { title: "Entrées de stock", description: "Suivez les réapprovisionnements" },
  suppliers: { title: "Fournisseurs", description: "Gérez vos fournisseurs" },
  dishes: { title: "Plats", description: "Gérez la carte des plats" },
  drinks: { title: "Boissons", description: "Gérez la carte des boissons" },
  sales: { title: "Ventes / Revenus", description: "Enregistrez et consultez les ventes" },
  expenses: { title: "Dépenses", description: "Suivez toutes vos dépenses" },
  accounting: { title: "Comptabilité", description: "Entrées, sorties et bénéfice" },
  stats: { title: "Statistiques", description: "Analyse des performances" },
  feedback: { title: "Avis clients", description: "Ce que les clients n'aiment pas" },
  search: { title: "Recherche", description: "Recherchez instantanément dans toute l'application" },
  alerts: { title: "Alertes", description: "Stock faible et épuisé" },
  export: { title: "Export", description: "Exportez vos données en PDF, Excel ou CSV" },
  backup: { title: "Sauvegarde & Restauration", description: "Protégez vos données" },
};

function ModuleView({ id }: { id: ModuleId }) {
  switch (id) {
    case "dashboard": return <DashboardModule />;
    case "categories": return <CategoriesModule />;
    case "products": return <ProductsModule />;
    case "stock": return <StockEntriesModule />;
    case "suppliers": return <SuppliersModule />;
    case "dishes": return <DishesModule />;
    case "drinks": return <DrinksModule />;
    case "sales": return <SalesModule />;
    case "expenses": return <ExpensesModule />;
    case "accounting": return <AccountingModule />;
    case "stats": return <StatsModule />;
    case "feedback": return <FeedbackModule />;
    case "search": return <SearchModule />;
    case "alerts": return <AlertsModule />;
    case "export": return <ExportModule />;
    case "backup": return <BackupModule />;
    default: return null;
  }
}

export default function Home() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toggle } = useTheme();

  // Naviguer vers un module via événement global (utilisé par alertes/recherche)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ModuleId;
      if (detail) setActive(detail);
    };
    window.addEventListener("elishama:navigate", handler);
    return () => window.removeEventListener("elishama:navigate", handler);
  }, []);

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-base leading-tight truncate">ELISHAMA</div>
          <div className="text-[11px] text-sidebar-foreground/60 leading-tight">Gestion Restaurant</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scroll-thin px-2 py-3 space-y-4">
        {NAV.map((group) => (
          <div key={group.title}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{group.title}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActive(item.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors text-left",
                    active === item.id
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <Button variant="ghost" size="sm" onClick={toggle} className="w-full justify-start gap-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
          Thème clair / sombre
        </Button>
      </div>
    </div>
  );

  const meta = TITLES[active];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-sidebar-border">{SidebarContent}</aside>

      {/* Sidebar mobile */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4 py-3 md:px-6 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight truncate">{meta.title}</h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{meta.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} className="shrink-0">
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="h-4 w-4 hidden dark:block" />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto scroll-thin p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <ModuleView id={active} />
          </div>
        </main>
      </div>
    </div>
  );
}
