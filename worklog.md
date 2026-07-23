# ELISHAMA — Worklog partagé

Application de gestion de restaurant ELISHAMA (Next.js 16 + SQLite local + Prisma).

---
Task ID: 1 & 2 & 3 & 4
Agent: main (orchestrator)
Task: Foundation — schéma Prisma, lib partagée, layout, toutes les routes API, composants UI partagés, page shell

Work Log:
- Schéma Prisma complet créé (Category, Product, Dish, Drink, Supplier, StockEntry, Sale, SaleItem, Expense, ExpenseCategory, CustomerFeedback) — `prisma/schema.prisma`, poussé via `bun run db:push`
- `src/lib/utils.ts` : formatMoney (FCFA), formatDate, formatDateTime, toInputDate, toInputDateTime, isSameDay, startOfDay, endOfDay, cn
- `src/lib/api.ts` : apiFetch (client), photoUrl
- `src/lib/export.ts` : downloadCSV, downloadExcel (SheetJS/xlsx), printHTML (PDF via impression navigateur)
- Thème CSS personnalisé (palette orange/ambre restaurant) + scrollbar custom + print media — `src/app/globals.css`
- `src/app/layout.tsx` : metadata ELISHAMA, ThemeProvider (clair/sombre)
- `src/components/shared/theme-provider.tsx` : useTheme + toggle
- `src/components/shared/PhotoUpload.tsx` : upload photo via /api/upload, preview, retrait
- `src/components/shared/ConfirmDialog.tsx` : dialogue confirmation suppression
- `src/components/shared/EmptyState.tsx` : état vide
- `src/components/shared/StatCard.tsx` : carte statistique avec tone
- `src/components/shared/PageHeader.tsx` : en-tête de module
- `src/app/page.tsx` : shell principal — sidebar (desktop fixe + mobile Sheet), 16 modules routés via state, toggle thème, écoute événement `elishama:navigate` (detail = module id) pour navigation croisée
- Routes API CRUD complètes :
  - `/api/categories` (+[id]) GET/POST/PUT/DELETE
  - `/api/products` (+[id]) — filtres categoryId/lowStock/outOfStock/available ; création/maj/duplication
  - `/api/dishes` (+[id])
  - `/api/drinks` (+[id])
  - `/api/suppliers` (+[id])
  - `/api/stock-entries` (+[id]) — incrémente stock produit à la création, ajuste à la modif, décrémente au delete (transaction)
  - `/api/sales` (+[id]) — POST crée sale + items, décrémente stock produits ; DELETE réincrémente ; filtres période
  - `/api/expense-categories` (+[id])
  - `/api/expenses` (+[id]) — filtres categoryId/période
  - `/api/feedback` (+[id])
  - `/api/dashboard` — KPIs du jour + alertes + top plats/boissons/produits + chart 7 jours
  - `/api/stats` — top/least vendus, top revenus, top dépenses, par type
  - `/api/search?q=` — recherche globale produits/plats/boissons/ventes/dépenses/stock
  - `/api/export?type=...&from=&to=` — CSV (ventes, dépenses, produits, stock-entries, dishes, drinks, accounting)
  - `/api/backup` GET — zip (db + uploads + manifest.json) nommé Sauvegarde_DD_MM_YYYY.zip
  - `/api/restore` POST — restore zip
  - `/api/upload` POST — upload photo -> /uploads/filename
- Dépendances ajoutées : xlsx (Excel), adm-zip (backup zip)

Stage Summary:
- Base de données SQLite locale opérationnelle, 100% personnalisable (vide au premier démarrage)
- Toutes les routes API backend en place
- Shell frontend + composants partagés prêts
- LES MODULES FRONTEND (src/components/modules/*.tsx) NE SONT PAS ENCORE CRÉÉS — c'est le travail des sous-agents suivants
- Convention navigation croisée : `window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: "products" }))`
- Photos stockées dans /public/uploads, accessibles via photoUrl(path)

---
Task ID: 5
Agent: subagent-A (Dashboard)
Task: Module Tableau de bord (KPIs + graphiques recharts + top ventes + alertes)

Work Log:
- Lecture du worklog + des composants partagés (PageHeader, StatCard, EmptyState) et de la route /api/dashboard pour aligner les types
- Création de `src/components/modules/dashboard.tsx` (export nommé `DashboardModule`)
- En-tête PageHeader "Aujourd'hui" (icône LayoutDashboard) + boutons "Actualiser" (RotateCw, spin pendant le refresh) et "Nouvelle vente" (dispatch `elishama:navigate` → "sales")
- 4 StatCards KPIs du jour : CA (primary/Receipt), Dépenses (warning/Wallet), Bénéfice (success si >=0 sinon danger, TrendingUp/TrendingDown dynamique), Nombre de ventes (default/ShoppingCart) — montants via formatMoney
- 3 graphiques recharts (ResponsiveContainer height 260) dans une grille `md:grid-cols-2 xl:grid-cols-3` : AreaChart revenus (chart-1 + gradient), BarChart dépenses (chart-2), LineChart bénéfice (chart-3) sur 7 jours. Tooltip personnalisé formatMoney. Ticks/grid stylés via utilitaires Tailwind fill-*/stroke-* (les CSS vars du thème sont en oklch, donc var(--chart-N) utilisé directement)
- 3 cartes Top des ventes (Plats/Boissons/Produits) avec liste scrollable max-h-72, badge quantité + total, EmptyState si vide
- Carte Alertes & stock faible : badges compteurs (stock faible amber / épuisé rouge), liste cliquable des alerts (navigue vers "products"), EmptyState si aucune alerte
- États de chargement via Skeleton (KPIs, charts, top ventes, alertes)
- Fetch via apiFetch<DashboardData>("/api/dashboard") dans useEffect + callback de refresh, gestion d'erreur via toast sonner
- Vérification : `eslint src/components/modules/dashboard.tsx` → 0 erreur ; `tsc --noEmit` → 0 erreur sur ce fichier (les 21 erreurs restantes viennent des autres modules non encore créés et de fichiers examples/skills)

Stage Summary:
- Fichier créé: src/components/modules/dashboard.tsx
- Palette orange/ambre respectée (aucun indigo/bleu), tons sémantiques pour les StatCards
- Couleurs de charts via var(--chart-1..3) (variables oklch du thème), ticks/grille via classes Tailwind fill-muted-foreground / stroke-border
- Responsive mobile-first (grid-cols-1 → sm:2 → xl:4 pour les KPIs ; md:2 → xl:3 pour les charts ; lg:3 pour les tops)
- Navigation croisée fonctionnelle vers "sales" (nouvelle vente) et "products" (alertes)
- Convention d'import respectée : PageHeader, StatCard, EmptyState, apiFetch, utils, shadcn Card/Button/Badge/Skeleton, lucide-react, recharts, sonner

---
Task ID: 8
Agent: subagent-D (Dishes + Drinks)
Task: Modules Plats et Boissons (carte du menu)

Work Log:
- Lecture du worklog + composants partagés (PageHeader, StatCard, EmptyState, PhotoUpload, ConfirmDialog) + routes /api/dishes et /api/drinks pour aligner les types (id, name, photo, price, description, available, createdAt)
- Création de `src/components/modules/dishes.tsx` (export nommé `DishesModule`)
- Création de `src/components/modules/drinks.tsx` (export nommé `DrinksModule`)
- Choix d'architecture : modules autonomes (pas de `_menu-items.tsx` partagé) pour éviter tout conflit d'export et garder chaque module indépendant, conformément à la note du brief
- Chaque module : PageHeader (icône UtensilsCrossed/Wine) + bouton "Nouveau plat/boisson", 2 StatCards (disponibles tone success, total tone primary), grille responsive `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Carte item : photo aspect-square (object-cover, fallback icône sur fond muted), badge Disponible/Indisponible (vert émeraude / zinc) en overlay top-left, DropdownMenu actions (Modifier/Supprimer) top-right, corps avec nom (truncate), prix formatMoney en text-primary font-bold, description line-clamp-2 (min-h fixe pour aligner), Switch de disponibilité rapide en footer (PUT partiel `{ available }`, optimiste local + reload)
- Formulaire Dialog : PhotoUpload, Nom (requis), Prix (number requis, validation >=0), Description Textarea, Switch Disponible dans un cadre borduré ; validation inline + Loader2 pendant submit
- Suppression : AlertDialog contrôlée par état `deleting` (le ConfirmDialog partagé est trigger-based et ne s'adapte pas au déclenchement depuis un DropdownMenuItem) — message personnalisé avec le nom de l'élément
- États : loading (Skeletons pour stats + 8 cartes), empty (EmptyState avec exemple Kedjenou poulet / Coca-Fanta + bouton d'action), erreur via toast sonner
- Rechargement `load()` après chaque CUD ; toggle optimiste local puis fallback reload implicite
- Vérification : `npx eslint src/components/modules/dishes.tsx src/components/modules/drinks.tsx` → 0 erreur 0 warning ; `npx tsc --noEmit` → 0 erreur sur ces 2 fichiers (erreurs restantes = autres modules non créés par d'autres sous-agents)

Stage Summary:
- Fichiers créés: src/components/modules/dishes.tsx, src/components/modules/drinks.tsx
- Palette orange/ambre respectée (prix en text-primary, StatCards primary/success, badges émeraude/zinc) — aucun indigo/bleu
- Structure quasi identique entre les 2 modules (seuls l'icône, l'endpoint, les libellés et l'exemple d'empty state diffèrent)
- Responsive mobile-first (grille 1→2→3→4 colonnes, header flex-col→row)
- Formatage des prix via formatMoney (FCFA), typage strict via interfaces Dish/Drink et *FormValues
- Décision : AlertDialog contrôlé pour la suppression plutôt que ConfirmDialog (trigger-based), car le déclenchement vient d'un DropdownMenuItem — rendu déclaratif piloté par l'état `deleting`

---
Task ID: 6
Agent: subagent-B (Categories + Products)
Task: Modules Catégories et Produits (CRUD complet, filtres, duplication, historique)

Work Log:
- Lecture du worklog + composants partagés (PageHeader, EmptyState, ConfirmDialog, PhotoUpload, StatCard) + routes API /api/categories et /api/products (GET/POST/PUT/DELETE, filtres categoryId/lowStock/outOfStock/available, GET [id] avec stockEntries) + schéma Prisma pour aligner les types
- Création de `src/components/modules/categories.tsx` (export nommé `CategoriesModule`)
- Création de `src/components/modules/products.tsx` (export nommé `ProductsModule`)
- Module Catégories : PageHeader (icône FolderTree, bouton "Nouvelle catégorie"), grille responsive `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, carte avec emoji grand (fallback Tags), badge "N produits" (_count.products), description line-clamp-2, date création, boutons Modifier/Supprimer en footer ; formulaire Dialog (nom requis, emoji Input texte, description Textarea) ; EmptyState "Aucune catégorie" avec bouton ; toasts succès/erreur ; ConfirmDialog partagé pour la suppression (trigger = Button direct, pas de nesting)
- Module Produits : PageHeader (icône Package, bouton "Nouveau produit"), barre de filtres en Card (recherche Input avec icône Search, Select catégorie "Toutes + liste", Select disponibilité "Tous/Disponibles/Indisponibles", badges cliquables "Stock faible"/"Épuisé" avec compteurs et état actif coloré, bouton "Réinitialiser" conditionnel, compteur de résultats)
- Table scrollable `max-h-[60vh] overflow-y-auto scroll-thin` avec en-tête sticky : Photo (thumbnail 40x40 arrondi via photoUrl + fallback Package), Nom + code interne, Catégorie (badge avec emoji), Prix achat (formatMoney muted), Prix vente (formatMoney medium), Stock coloré (rouge si <=0, ambre si <=minStock, émeraude sinon) avec unité et icône AlertTriangle si épuisé, Dispo (badge vert/zinc), Actions (DropdownMenu: Modifier/Dupliquer/Historique/Séparateur/Supprimer)
- Formulaire Dialog (sm:max-w-2xl, scrollable) : PhotoUpload, Nom (requis), Code interne, Catégorie (Select avec sentinel "__none__" pour "Aucune catégorie"), Prix achat/vente (number), Quantité/Stock min (number), Unité (texte défaut "unité"), Description Textarea, Disponible (Switch dans cadre borduré) ; titre dynamique "Nouveau/Modifier/Dupliquer le produit"
- Duplication : openDuplicate() pré-remplit le formulaire avec les valeurs du produit (sans id), titre "Dupliquer le produit", bouton "Dupliquer"
- Historique : Dialog séparé fetch GET /api/products/[id], affiche stockEntries (date formatDateTime, quantité +unit en émeraude, fournisseur, prix unitaire, total calculé, observation) dans scroll-area max-h-[55vh] ; EmptyState si vide ; bouton "Ajouter une entrée" qui ferme le dialog et dispatch `elishama:navigate` → "stock"
- Suppression : AlertDialog contrôlé par état `deleteTarget` + `deleting` (le ConfirmDialog partagé est trigger-based et ne s'adapte pas proprement au déclenchement depuis un DropdownMenuItem — même décision que subagent-D pour dishes/drinks)
- États : loading (Skeleton), empty (EmptyState différencié "aucun produit" vs "aucun résultat de filtre"), erreur via toast sonner
- Rechargement `load()` au mount + après chaque CUD ; `loadCategories()` au mount pour les Selects ; recherche locale (useMemo) sur nom + code interne ; compteurs stock faible/épuisé calculés en useMemo
- Typage strict via interfaces Category, Product, StockEntry, ProductDetail, ProductFormValues (pas de `any`) ; helpers productToForm/emptyForm pour le formulaire
- Vérification : `npx eslint src/components/modules/categories.tsx src/components/modules/products.tsx` → 0 erreur 0 warning ; `npx tsc --noEmit` → 0 erreur sur ces 2 fichiers (erreurs restantes = autres modules non créés + examples/skills/api préexistants)

Stage Summary:
- Fichiers créés: src/components/modules/categories.tsx, src/components/modules/products.tsx
- Palette orange/ambre respectée (primary pour accents, émeraude/ambre/rouge pour stock, aucun indigo/bleu)
- Responsive mobile-first (catégories : grille 1→2→3→4 ; produits : filtres flex-col→row, table scrollable horizontal+vertical avec en-tête sticky)
- Convention navigation croisée respectée : `window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: "stock" }))` depuis l'historique produit
- Formatage via formatMoney (FCFA), formatNumber, formatDateTime ; typage strict sans `any`
- Décision : AlertDialog contrôlé pour la suppression produits (déclenchement depuis DropdownMenu) ; ConfirmDialog partagé conservé pour catégories (trigger = Button direct)

---
Task ID: 7
Agent: subagent-C (Stock Entries + Suppliers)
Task: Modules Entrées de stock et Fournisseurs

Work Log:
- Lecture du worklog + composants partagés (PageHeader, StatCard, EmptyState, ConfirmDialog) + routes API /api/stock-entries, /api/suppliers, /api/products + lib utils/api/export pour aligner les types et conventions
- Création de `src/components/modules/stock-entries.tsx` (export nommé `StockEntriesModule`)
- Création de `src/components/modules/suppliers.tsx` (export nommé `SuppliersModule`)
- Module Entrées de stock :
  - PageHeader titre "Entrées de stock" (icône PackagePlus) + actions : Actualiser (RotateCw, spin si refreshing), Exporter (DropdownMenu CSV/Excel), Nouvelle entrée (Plus)
  - 3 StatCards : "Entrées aujourd'hui" (count + hint quantité reçue, tone primary), "Valeur du jour" (somme qty×unitPrice, tone success), "Total entrées" (toutes périodes, tone default) — calculées à partir de toutes les entrées (sans filtre) via isSameDay(date, new Date())
  - Section "Aujourd'hui" : Card avec fond accent primary/5 + bordure primary/30, liste des entrées du jour (badge quantité émeraude "+X unité", nom produit, fournisseur avec icône Truck, prix unitaire formatMoney aligné à droite, observation en line-clamp-1)
  - Filtres en Card : Select produit (sentinel "all" → "Tous les produits"), Select fournisseur (idem), inputs date From/To (type=date, avec max/min croisés pour empêcher inversion), bouton "Réinitialiser" si filtre actif
  - Table scrollable `max-h-[60vh] overflow-y-auto scroll-thin` avec en-tête sticky : Date (formatDateTime), Produit, Fournisseur, Quantité (badge secondaire "+X unité" en émeraude), Prix unitaire (formatMoney), Total calculé (qty×price formatMoney), Observation (truncate + title), Actions (DropdownMenu Modifier/Supprimer)
  - Formulaire Dialog (max-w-2xl, scrollable) : Date (datetime-local, défaut toInputDateTime(new Date())), "Produit existant" (Select avec option "✏️ Saisie manuelle" valeur "__manual__" + liste produits avec stock actuel) qui au changement remplit productName et productId, "Nom du produit" (Input texte libre requis — éditer ce champ efface productId pour basculer en mode manuel), même pattern pour Fournisseur, Quantité (number >0 requis), Prix unitaire (number), Observation (Textarea)
  - Suppression : AlertDialog contrôlée par état `toDelete` + `deleting` (ConfirmDialog partagé est trigger-based et ne s'adapte pas au déclenchement depuis DropdownMenuItem — même décision que subagents B/D), message personnalisé avec nom produit et quantité
  - Export CSV/Excel via downloadCSV/downloadExcel sur la liste filtrée (headers : Date, Produit, Fournisseur, Quantité, Prix unitaire, Total, Observation), toast si liste vide
  - EmptyState "Aucune entrée de stock — Enregistrez votre premier réapprovisionnement" avec bouton d'action
  - États loading (Skeleton pour KPIs et lignes de table), erreur via toast sonner, rechargement `load()` après chaque CUD
- Module Fournisseurs :
  - PageHeader titre "Fournisseurs" (icône Truck) + actions Actualiser / Nouveau fournisseur
  - Grille responsive `grid sm:grid-cols-2 lg:grid-cols-3 gap-4` de Cards
  - Chaque Card : icône Truck dans cadre primary/10, nom (truncate font-semibold), badge "X entrées" (utilise _count.stockEntries), téléphone cliquable (tel:) avec icône Phone ou placeholder italique si vide, adresse avec MapPin ou placeholder, description line-clamp-3, footer "Depuis le {date}" + boutons Modifier/Supprimer (icônes Pencil/Trash2)
  - Formulaire Dialog (max-w-lg) : Nom (requis), Téléphone (tel), Adresse, Description (Textarea) — fonctionnel pour create et edit (titre dynamique)
  - Suppression : ConfirmDialog partagé (trigger = Button direct, donc OK) avec message rappelant que les entrées de stock associées conservent le nom
  - EmptyState "Aucun fournisseur" avec bouton d'action ; états loading (6 Skeletons) et erreur (toast)
- Typage strict via interfaces StockEntry, ProductLite, SupplierLite, Supplier, FormState (pas de `any`) ; helpers emptyForm() et constantes sentinels MANUAL/ALL
- Vérification : `npx eslint src/components/modules/stock-entries.tsx src/components/modules/suppliers.tsx` → 0 erreur 0 warning ; `npx tsc --noEmit` → 0 erreur sur ces 2 fichiers (erreurs restantes = autres modules non créés par d'autres sous-agents + examples/skills/api préexistants)

Stage Summary:
- Fichiers créés: src/components/modules/stock-entries.tsx, src/components/modules/suppliers.tsx
- Palette orange/ambre respectée (primary pour accents, émeraude pour quantités d'entrée, aucun indigo/bleu)
- Pattern "Select produit existant OU saisie manuelle" via sentinelle "__manual__" : choisir un produit remplit automatiquement productName+productId, éditer le champ texte bascule en mode manuel (productId vidé)
- Filtres combinés produit/fournisseur/plage de dates appliqués uniquement au tableau (KPIs et section "Aujourd'hui" restent calculés sur l'ensemble)
- Responsive mobile-first (KPIs 1→3 colonnes, filtres 1→2→4, grille fournisseurs 1→2→3, table scrollable avec en-tête sticky)
- Formatage via formatMoney (FCFA), formatNumber, formatDateTime, formatDate, toInputDateTime, isSameDay
- Décision : AlertDialog contrôlé pour suppression stock-entries (déclenchement depuis DropdownMenu) ; ConfirmDialog partagé conservé pour suppliers (trigger = Button direct)
- Convention d'import respectée : PageHeader, StatCard, EmptyState, ConfirmDialog, apiFetch, utils, export, shadcn Card/Button/Badge/Dialog/DropdownMenu/Input/Label/Select/Skeleton/Table/Textarea/AlertDialog, lucide-react, sonner

---
Task ID: 9
Agent: subagent-E (Sales)
Task: Module Ventes/Revenus (caisse POS + historique + exports)

Work Log:
- Lecture du worklog + des composants partagés (PageHeader, StatCard, EmptyState, ConfirmDialog), des routes /api/sales, /api/products, /api/dishes, /api/drinks et du schéma Prisma (Sale / SaleItem) pour aligner les types
- Création de `src/components/modules/sales.tsx` (export nommé `SalesModule`)
- Architecture : 2 onglets (Tabs racine) « Nouvelle vente » (POS) et « Historique » ; le composant principal orchestre la bascule d'onglet et déclenche un refresh de l'historique après chaque vente enregistrée via une `refreshKey`
- Onglet POS : layout `lg:grid-cols-3` — colonne gauche (catalogue, lg:col-span-2) avec recherche + sous-Tabs Plats/Boissons/Produits (compteurs live), grille responsive de boutons-cards (photo, nom, prix, hint unité) qui ajoutent au panier ou incrémentent la quantité si l'article y est déjà ; colonne droite (panier sticky sur lg+) — sur mobile, panier masqué et remplacé par un bouton flottant « Panier (N) » qui ouvre un Sheet (side=bottom)
- Panier : carte avec liste scrollable, quantité - / +, input prix unitaire modifiable, bouton remove (X), EmptyState quand vide, textarea Note optionnel, encart total en gros (formatMoney), bouton « Enregistrer la vente » (Loader2 pendant submit, désactivé si panier vide). Au submit : POST /api/sales avec mapping `productId|dishId|drinkId` selon `itemType`, toast succès, vidage panier, bascule vers l'onglet Historique
- Onglet Historique : filtres Card (Select période today/week/month/year/custom + 2 inputs date si custom), bouton Actualiser, boutons CSV / Excel / PDF ; 3 StatCards (Revenu total=primary/TrendingUp, Nombre de ventes=default/ShoppingBag, Panier moyen=warning/Wallet) avec hint = libellé période
- Liste des ventes : conteneur scrollable `max-h-[60vh]`, chaque vente = ligne Card (date formatDateTime, badge nb articles, note tronquée, total formatMoney, boutons Détail + Supprimer via ConfirmDialog « Le stock des produits sera rétabli ») ; EmptyState si aucune vente
- Dialogue détail : Table (Article / Qté / P.U. / Total) avec ligne Total en gras + note éventuelle
- Exports : CSV et Excel via `downloadCSV`/`downloadExcel` (cols Date/Articles/Total FCFA), PDF via `printHTML("Revenus — Ventes", html)` avec en-tête ELISHAMA, 3 cards KPIs + table des ventes + ligne « Total général » stylée `.total`
- États : Skeleton (grille catalogue, KPIs, lignes ventes), EmptyState (panier vide, listes catalogues vides, historique vide), toasts sonner (succès/erreur/info)
- Hooks useState/useEffect/useCallback/useMemo, fonction `load()` (catalogue POS et historique), `cartKey(itemType:refId)` pour identifier les lignes panier, `lineTotal`, `itemCount`
- Typage strict via interfaces (Product, Dish, Drink, SaleItem, Sale, CartItem, PeriodKey)
- Vérification : `npx tsc --noEmit` → 0 erreur sur le fichier ; `eslint src/components/modules/sales.tsx` → 0 erreur / 0 warning

Stage Summary:
- Fichier créé: src/components/modules/sales.tsx
- Palette orange/ambre respectée (aucun indigo/bleu), tons sémantiques pour les StatCards (primary/default/warning)
- UX caisse soignée : grille de cards cliquables avec photo + hover, panier adaptatif (sticky desktop / Sheet mobile avec bouton flottant), prix unitaire éditable inline, note optionnelle, total en gras, feedback immédiat via toasts
- Navigation croisée implicite : l'enregistrement d'une vente bascule vers l'historique et le rafraîchit (le tableau de bord du sous-agent A reste cohérent car il se recharge à chaque visite)
- Convention d'imports respectée : PageHeader, StatCard, EmptyState, ConfirmDialog, apiFetch, photoUrl, utils (cn/formatMoney/formatNumber/formatDateTime), export (downloadCSV/downloadExcel/printHTML), shadcn Card/Button/Badge/Tabs/Input/Label/Textarea/Select/Dialog/Sheet/ScrollArea/Table/Skeleton, lucide-react, sonner
- Module central opérationnel et prêt à être branché sur `src/app/page.tsx` (déjà importé sous `SalesModule`)

---
Task ID: 10
Agent: subagent-F (Expenses + Accounting)
Task: Modules Dépenses (catégories personnalisables + photo facture) et Comptabilité (entrées/sorties/bénéfice + exports)

Work Log:
- Lecture du worklog + composants partagés (PageHeader, StatCard, EmptyState, PhotoUpload) + routes API /api/expenses, /api/expense-categories, /api/sales + modules existants (sales.tsx pour la structure des filtres période + exports, categories.tsx pour la gestion emoji) afin d'aligner types et conventions
- Création de `src/components/modules/expenses.tsx` (export nommé `ExpensesModule`)
- Création de `src/components/modules/accounting.tsx` (export nommé `AccountingModule`)
- Module Dépenses :
  - PageHeader titre "Dépenses" (icône Wallet) + actions Actualiser (RotateCw, spin si refreshing) et "Nouvelle dépense" (Plus)
  - Barre de filtres Card : Select catégorie (sentinel "all" → "Toutes les catégories" + liste des catégories de dépenses avec emoji), Select période (today/week/month/year/custom + 2 inputs date si custom), boutons Export CSV/Excel/PDF alignés à droite (sm:ml-auto)
  - 2 StatCards : "Total dépenses" (warning, Wallet, formatMoney, hint période), "Nombre de dépenses" (default, Receipt)
  - Table scrollable `max-h-[60vh] overflow-auto scroll-thin` avec en-tête sticky : Date (formatDate), Nom, Montant (formatMoney préfixé "−" en text-destructive), Catégorie (Badge secondary avec emoji + nom truncate), Facture (thumbnail 40×40 cliquable si photo → ouvre Dialog visionneuse, fallback ImageOff si pas de photo), Description (truncate max-w-[280px], caché sur mobile), Actions (DropdownMenu: Modifier / séparateur / Supprimer)
  - Formulaire Dialog (sm:max-w-lg) : Nom (requis), Montant (number >0 requis, validation JS), Date (date, défaut today via toInputDate), Catégorie (Select avec "Aucune" + liste + séparateur + "➕ Créer une catégorie…" qui ouvre le mini-dialogue), PhotoUpload "Photo de la facture", Description Textarea
  - Mini-dialogue inline création catégorie (sm:max-w-sm) : Emoji (Input 80px centré) + Nom (requis), POST /api/expense-categories puis recharge la liste et sélectionne automatiquement la nouvelle catégorie dans le formulaire dépense
  - Visionneuse photo : Dialog sm:max-w-3xl avec img object-contain max-h-[70vh]
  - Suppression : AlertDialog contrôlée par état `toDelete` + `deleting` (ConfirmDialog partagé est trigger-based, non adapté au déclenchement depuis DropdownMenuItem — même décision que sous-agents B/C/D/E), message personnalisé avec nom et montant
  - Exports : CSV/Excel via downloadCSV/downloadExcel (headers Date/Libellé/Montant/Catégorie/Description), PDF via printHTML avec 3 cards (Total/Nb/Période) + table + ligne Total stylée .total
  - EmptyState "Aucune dépense — Enregistrez votre première dépense" avec bouton d'action
  - États loading (Skeletons pour stats + 5 lignes de table), erreur (toast sonner), rechargement `load()` + `loadCategories()` après chaque CUD
  - Footer discret : petit indicateur visuel période avec icône Calendar
- Module Comptabilité :
  - PageHeader titre "Comptabilité" description "Entrées, sorties et bénéfice" (icône Calculator) + action Actualiser
  - Sélecteur de période : Tabs (Auj./Semaine/Mois/Année/Perso.) dans une Card avec les boutons d'exports CSV/Excel/PDF + 2 inputs date si "Perso."
  - Chargement parallèle via Promise.all de `/api/sales?{query}` et `/api/expenses?{query}` sur la MÊME période (query construite via buildQuery())
  - 3 StatCards : "Entrées" (success/TrendingUp, hint "{nb ventes} ventes · {période}"), "Sorties" (danger/TrendingDown, hint "{nb dépenses} dépenses · {période}"), "Bénéfice" (success si >=0 sinon danger, PiggyBank, hint "Excédent"/"Déficit")
  - Tableau mouvements chronologique fusion entrées+sorties trié par date desc, scrollable max-h-[60vh] : Type (Badge Entrée vert émeraude avec ArrowUpCircle / Sortie rouge avec ArrowDownCircle), Date (formatDateTime), Libellé (nom + note/catégorie/description en truncate), Montant (vert "+formatMoney" pour entrée, rouge "−formatMoney" pour sortie)
  - Card synthèse (border-primary/20 bg-primary/5) en bas : résumé visuel "+entrées · −sorties" + Bénéfice net en gras
  - Exports : CSV/Excel (Type/Date/Libellé/Détail/Montant, montants négatifs pour les sorties), PDF via printHTML avec 3 cards colorées (Entrées vert / Sorties rouge / Bénéfice couleur dynamique) + table des mouvements + ligne "Bénéfice net" stylée .total
  - EmptyState "Aucun mouvement sur cette période" si ni ventes ni dépenses
  - Loading overlay discret (bottom-right) pendant le rafraîchissement silencieux
  - États loading (Skeletons pour 3 KPIs + 5 lignes de table), erreur (toast sonner)
- Typage strict via interfaces (ExpenseCategory, Expense, ExpenseFormValues, Sale, Movement, PeriodKey) — pas de `any`
- Constantes sentinels NO_CATEGORY / CREATE_CATEGORY pour le Select catégorie, PERIOD_LABELS partagés
- Helpers locaux escapeHTML() pour échapper le contenu dans les exports PDF
- Vérification : `npx eslint src/components/modules/expenses.tsx src/components/modules/accounting.tsx --max-warnings 0` → 0 erreur 0 warning ; `npx tsc --noEmit` → 0 erreur sur ces 2 fichiers (erreurs restantes = autres modules non créés par d'autres sous-agents + examples/skills/api préexistants)

Stage Summary:
- Fichiers créés: src/components/modules/expenses.tsx, src/components/modules/accounting.tsx
- Palette orange/ambre respectée (primary pour accents, émeraude pour entrées/bénéfice positif, rouge/destructive pour sorties/bénéfice négatif, ambre pour total dépenses) — aucun indigo/bleu
- Module Dépenses 100% personnalisable : aucune catégorie imposée, l'utilisateur crée ses propres catégories de dépenses via mini-dialogue inline depuis le formulaire (POST /api/expense-categories puis auto-sélection)
- Photo de facture : PhotoUpload dans le formulaire + thumbnail cliquable dans la table + visionneuse plein écran en Dialog
- Module Comptabilité : fusion des ventes (entrées) et dépenses (sorties) sur la MÊME période, calcul du bénéfice avec tone dynamique (success/danger), tableau chronologique trié desc
- Responsive mobile-first (filtres flex-col→row, KPIs 1→2 ou 3 colonnes, table scrollable avec en-tête sticky, colonne Description cachée sur md-)
- Convention d'imports respectée : PageHeader, StatCard, EmptyState, PhotoUpload, apiFetch, photoUrl, utils (cn/formatMoney/formatDate/formatDateTime/toInputDate), export (downloadCSV/downloadExcel/printHTML), shadcn Card/Button/Badge/Dialog/AlertDialog/DropdownMenu/Input/Label/Textarea/Select/Skeleton/Table/Tabs, lucide-react, sonner
- Décision : AlertDialog contrôlé pour suppression dépense (déclenchement depuis DropdownMenu) ; Tabs pour le sélecteur de période du module Comptabilité (plus visuel qu'un Select)
- Les deux modules sont déjà importés dans src/app/page.tsx sous `ExpensesModule` et `AccountingModule` — prêts à l'emploi

---
Task ID: 11
Agent: subagent-G (Statistics + Feedback + Alerts)
Task: Modules Statistiques (graphiques recharts), Avis clients, Alertes stock

Work Log:
- Lecture du worklog + composants partagés (PageHeader, StatCard, EmptyState, ConfirmDialog) + routes API /api/stats, /api/feedback(+[id]), /api/dashboard + lib utils/api + modules dashboard/suppliers pour aligner conventions (tons, CHART_WRAPPER, navigation croisée, tooltips recharts)
- Création de `src/components/modules/stats.tsx` (export nommé `StatsModule`)
  - PageHeader titre "Statistiques" icône BarChart3 + bouton "Actualiser" (RotateCw, spin si refreshing)
  - Filtre période en Card : 2 inputs date From/To (max croisés pour empêcher inversion + max=today sur To), bouton "30 derniers jours" (reset), bouton "Analyser" (Loader2 pendant le load) — pattern à 2 états (fromInput/toInput contrôlent les inputs, from/to committés déclenchent le fetch via useEffect sur [load, from, to])
  - 3 StatCards : "Revenu total" (primary/Receipt), "Dépenses totales" (warning/Wallet), "Bénéfice" (success/danger dynamique, TrendingUp/TrendingDown selon signe)
  - 3 graphiques recharts dans une grille `md:grid-cols-2 xl:grid-cols-3` :
    * BarChart vertical (horizontal bars) "Top 10 des ventes" (par quantité, chart-1) avec YAxis category (width 130, truncate 18 chars), XAxis number compactNumber, Tooltip formatNumber
    * PieChart "Répartition par type" (Plats/Boissons/Produits par total, Cell chart-1/2/3, innerRadius 50/outerRadius 90, Legend bottom) avec Tooltip formatMoney ; slices à 0 filtrées (EmptyState si pieData vide)
    * BarChart vertical "Top dépenses" (chart-2, radius top) avec XAxis truncate 10 chars, Tooltip formatMoney
  - Wrapper CHART_WRAPPER pour styliser ticks/grid via classes Tailwind (variables oklch du thème)
  - 4 listes en Cards (grille `lg:grid-cols-2`) scrollables `max-h-80 overflow-y-auto scroll-thin` avec Table : "Les plus vendus" (topSold), "Les moins vendus" (leastSold), "Ce qui rapporte le plus" (topRevenue) — colonnes Nom/TypeBadge/Qté/Total ; "Dépenses les plus importantes" (topExpenses) — colonnes Libellé/Catégorie/Montant/Date. TypeBadge helper avec couleurs orange/ambre/jaune. EmptyState si vide.
  - Composants helpers : ChartCard (avec prop isEmpty → EmptyState), ListCard, ExpenseListCard, ChartTooltip (typé sans `any`, formatter configurable, gère label manquant pour PieChart)
  - States loading (Skeletons pour KPIs, charts, listes), erreur via toast sonner, rechargement via useEffect sur from/to committés
- Création de `src/components/modules/feedback.tsx` (export nommé `FeedbackModule`)
  - PageHeader titre "Avis clients" icône MessageSquareWarning + actions Actualiser / "Nouvel avis"
  - Grille responsive `sm:grid-cols-2 lg:grid-cols-3 gap-4` de Cards : chaque Card montre l'item concerné (icône Tag dans cadre primary si itemName renseigné, sinon icône MessageSquareWarning dans cadre muted avec titre "Avis général" en italique), badge type (Plat/Boisson/Produit avec icône UtensilsCrossed/Wine/Package et couleurs orange/ambre/jaune ; pas de badge si type absent), feedback en `whitespace-pre-wrap line-clamp-6`, date avec icône Calendar, boutons Modifier (Pencil) / Supprimer (ConfirmDialog partagé, trigger = Button direct)
  - Formulaire Dialog (max-w-lg) : Article concerné (Input, facultatif), Type (Select avec sentinel "none" → "Aucun" + Plat/Boisson/Produit, facultatif), Retour (Textarea rows=4, requis, validation feedback.trim()), Date (date, défaut aujourd'hui, max=today). Conversion "none" → null côté payload via normalizeItemType.
  - EmptyState "Aucun avis enregistré — Notez ici ce que les clients n'aiment pas pour améliorer votre carte" avec bouton d'action
  - States loading (6 Skeletons), erreur via toast sonner, rechargement `load(true)` après chaque CUD
- Création de `src/components/modules/alerts.tsx` (export nommé `AlertsModule`)
  - PageHeader titre "Alertes" icône Bell + bouton "Actualiser"
  - 2 StatCards : "Stock faible" (warning/AlertTriangle), "Stock épuisé" (danger/XCircle) — compteurs depuis /api/dashboard
  - Si totalAlerts === 0 : EmptyState "Aucune alerte — Tous vos stocks sont au niveau optimal" avec icône CheckCircle en vert (text-emerald-500)
  - Section "Stock épuisé" : Card avec en-tête icône rouge XCircle + badge destructive + compteur, grille `sm:grid-cols-2` de items (border/bg rouge), chaque item = icône Package rouge + nom + catégorie + "Stock : 0 unité" en rouge + bouton "Réapprovisionner" (PackagePlus) qui dispatch `elishama:navigate` → "stock"
  - Section "Stock faible" : Card avec en-tête icône ambre AlertTriangle + badge ambre + compteur, grille `lg:grid-cols-2` de items (border/bg ambre), chaque item = icône Package ambre + nom + catégorie + "X / Y unité" en ambre + bouton "Réapprovisionner" (même navigation), barre Progress (ratio quantity/minStock, max 100%) stylée ambre via `[&_[data-slot=progress-indicator]]:bg-amber-500` (le composant Progress shadcn code en dur bg-primary sur l'indicator), pourcentage à droite
  - Navigation croisée : `window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: "stock" }))` via helper navigateToStock()
  - States loading (Skeletons KPIs + section), erreur via toast sonner
- Typage strict via interfaces (TopItem, TopExpense, ByTypeEntry, StatsData, PieSlice, Feedback, FormState, Product, DashboardData, TooltipPayloadItem) — pas de `any`
- Vérification : `npx eslint src/components/modules/stats.tsx src/components/modules/feedback.tsx src/components/modules/alerts.tsx` → 0 erreur 0 warning ; `npx tsc --noEmit` → 0 erreur sur ces 3 fichiers (erreurs restantes = examples/skills/api préexistants)

Stage Summary:
- Fichiers créés: src/components/modules/stats.tsx, src/components/modules/feedback.tsx, src/components/modules/alerts.tsx
- Palette orange/ambre respectée (primary pour accents, émeraude/ambre/rouge pour sémantique, type badges orange/ambre/jaune) — aucun indigo/bleu
- Couleurs de charts via var(--chart-1..3) directement (variables oklch du thème)
- Pattern à 2 états pour le filtre période stats : fromInput/toInput (inputs contrôlés) vs from/to (valeurs committées qui déclenchent le fetch via useEffect) — permet à l'utilisateur de saisir une plage sans recharger à chaque frappe, et de l'appliquer explicitement avec "Analyser"
- Décision : pour la barre Progress ambre du stock faible, override via sélecteur descendant `[&_[data-slot=progress-indicator]]:bg-amber-500` car le composant shadcn Progress code en dur `bg-primary` sur l'indicator (pas surchargeable via props)
- Convention d'import respectée : PageHeader, StatCard, EmptyState, ConfirmDialog, apiFetch, utils (cn/formatMoney/formatNumber/formatDate/toInputDate), shadcn Card/Button/Badge/Dialog/Input/Label/Textarea/Select/Skeleton/Table/Progress, lucide-react, recharts, sonner
- Navigation croisée fonctionnelle : "Réapprovisionner" depuis alerts → dispatch `elishama:navigate` → "stock"
- Responsive mobile-first (stats : KPIs 1→3, charts 1→2→3, listes 1→2 ; feedback : 1→2→3 ; alerts : KPIs 1→2, listes 1→2)

---
Task ID: 12
Agent: subagent-H (Search + Backup + Export)
Task: Modules Recherche instantanée, Sauvegarde/Restauration ZIP, Export PDF/Excel/CSV

Work Log:
- Lecture du worklog + composants partagés (PageHeader, EmptyState, StatCard) + routes API /api/search, /api/export, /api/backup, /api/restore + lib utils/api/export pour aligner types et conventions
- Création de `src/components/modules/search.tsx` (export nommé `SearchModule`)
- Création de `src/components/modules/backup.tsx` (export nommé `BackupModule`)
- Création de `src/components/modules/export.tsx` (export nommé `ExportModule`)
- Module Recherche :
  - PageHeader "Recherche" (icône Search) + grand champ Input h-12 avec icône Search à gauche, bouton d'effacement X à droite, auto-focus via ref au montage
  - Debounce 300ms sur `query` → `debounced` ; recherche déclenchée dès que debounced non vide
  - `loading` DÉRIVÉ (pas de setState synchrone dans l'effet) : `debounced !== "" && fetchedQuery !== debounced` — `fetchedQuery` est setté dans les callbacks .then()/.catch() avec la query associée au résultat, ce qui évite d'afficher des résultats périmés sous un nouveau libellé et satisfait la règle `react-hooks/set-state-in-effect`
  - Gestion des races via flag `cancelled` dans le cleanup de l'effet
  - Résultats groupés en Cards repliables (Collapsible shadcn) : Produits (amber), Plats (emerald), Boissons (rose), Ventes (primary), Dépenses (red), Entrées de stock (fuchsia) — chaque groupe a un Badge coloré + compteur + icône, n'apparaît que s'il a des résultats
  - Chaque ligne = bouton plein large cliquable qui déclenche `window.dispatchEvent(new CustomEvent("elishama:navigate", { detail: "<moduleId>" }))` vers products/dishes/drinks/sales/expenses/stock
  - Produit : photo thumbnail (fallback icône) + nom + #code + catégorie + stock + prix vente ; Plat/Boisson : icône + nom + description + badge Disponible/Indisponible + prix ; Vente : icône + date + nb articles + note ou aperçu items + total ; Dépense : icône + nom + date + catégorie + montant destructive ; Stock : icône + productName + date + supplier + badge quantité "+N"
  - États : initial (EmptyState "Recherche globale"), chargement (4 Skeletons h-16), aucun résultat (EmptyState "Aucun résultat pour « q »"), erreur via toast sonner
  - Compteur total de résultats affiché au-dessus des groupes
- Module Sauvegarde & Restauration :
  - PageHeader "Sauvegarde & Restauration" (icône DatabaseBackup, description "Protégez vos données")
  - Card "Sauvegarder" (icône Download primary/10) : description avec nom de fichier `Sauvegarde_DD_MM_YYYY.zip` + gros bouton "Sauvegarder maintenant" qui crée un <a href="/api/backup" download> temporaire et déclenche le clic ; état "Préparation de la sauvegarde..." avec Loader2 pendant 1,5s ; toast succès
  - Card "Restaurer" (icône Upload amber) : input file stylé (file:bg-primary) accept=".zip,application/zip" + bouton "Restaurer" ; affiche nom et taille du fichier sélectionné ; ouvre un Dialog de confirmation "⚠️ Cette action remplacera toutes les données actuelles" avec bouton "Oui, restaurer" (variant destructive) ; au confirm : POST FormData vers /api/restore, toast succès "Restauration réussie : base + N photo(s)", puis `window.location.reload()` après 1,2s pour recharger les données
  - Card "Informations" (icône ShieldCheck emerald) : 2 sous-cards (Base SQLite / Photos) + encart ambre "Conseils" avec recommandation de sauvegarde régulière
  - Gestion des erreurs réseau via toast sonner ; état `restoring`/`backing` pour désactiver les boutons pendant l'opération
- Module Export :
  - PageHeader "Export" (icône FileDown, description "Exportez vos données en PDF, Excel ou CSV")
  - Card "Période (optionnelle)" avec 2 inputs date From/To (min/max croisés pour empêcher inversion) — s'applique aux ventes/dépenses/stock-entries/accounting
  - Grille responsive `md:grid-cols-2 xl:grid-cols-3` de 7 Cards : Ventes (Receipt), Dépenses (Wallet), Produits (Package), Entrées de stock (PackagePlus), Plats (UtensilsCrossed), Boissons (Wine), Comptabilité (Calculator) — chaque card a icône primary/10 + titre + description + (si filtre période actif) libellé de plage
  - 3 boutons par card : PDF (default), Excel (outline), CSV (outline) avec icônes FileText/FileSpreadsheet/Sheet et Loader2 quand busy
  - CSV : `window.location.href = buildExportURL(type, from, to)` (construit URL avec query params) — déclenche le téléchargement serveur (Content-Disposition: attachment)
  - Excel & PDF : fetch le CSV depuis /api/export, parse avec un parseur CSV maison robuste (gère BOM UTF-8, guillemets, champs échappés "", fins de ligne \r\n/\n), puis :
    - Excel : convertit chaque cellule en nombre si elle est numérique (regex `^-?\d+(\.\d+)?$` après normalisation), appelle `downloadExcel(fileBase, title, headers, rows)`
    - PDF : construit un HTML `<table>` avec headers + rows échappés (escapeHTML pour &/</>/") + ligne de total si pertinent (totalForCSV détecte la colonne "Montant total"/"Montant"/"Total" selon le type et somme), appelle `printHTML("Type — Export", bodyHTML)` qui ouvre une fenêtre d'impression
  - États busy indépendants par type+format (Record<string, boolean>) ; toasts succès/erreur ; message d'aide en bas pour le PDF (imprimer du navigateur)
  - Décision : approche "fetch CSV serveur + parse client" plutôt que "fetch JSON direct" car le CSV serveur est déjà la source de vérité formatée (dates en fr-FR, montants nets), et le parseur CSV est testable/robuste ; cela évite aussi de dupliquer la logique de sérialisation
- Vérification : `npx eslint src/components/modules/search.tsx src/components/modules/backup.tsx src/components/modules/export.tsx` → 0 erreur 0 warning ; `npx tsc --noEmit` → 0 erreur sur ces 3 fichiers (erreurs restantes = fichiers examples/skills + 2 routes API préexistantes backup/export non concernées par ce sous-agent)

Stage Summary:
- Fichiers créés: src/components/modules/search.tsx, src/components/modules/backup.tsx, src/components/modules/export.tsx
- Palette orange/ambre respectée (primary pour accents, emerald/amber/rose/red/fuchsia pour les badges de groupe — aucun indigo/bleu/violet froid)
- Pattern clé : `loading` dérivé d'un `fetchedQuery` state dans le module Recherche — contourne la règle `react-hooks/set-state-in-effect` (React 19+) qui interdit les setState synchrones dans le corps d'un useEffect, tout en gérant correctement les races et l'affichage des résultats périmés
- Parseur CSV maison robuste (BOM, guillemets doublés, CRLF/LF) pour les exports Excel/PDF côté client — réutilisable
- Navigation croisée depuis la recherche vers 6 modules via `elishama:navigate` (products/dishes/drinks/sales/expenses/stock)
- Sauvegarde : téléchargement ZIP via <a download> temporaire (évite window.location qui peut être intercepté) ; restauration : Dialog de confirmation + window.location.reload() après succès pour recharger les données restaurées
- Export : 3 formats par type, plage de dates optionnelle, total général dans le PDF pour les types monétaires (ventes/dépenses/stock/accounting)
- Responsive mobile-first (search : stacked ; backup : 1→2 colonnes ; export : 1→2→3 cards, période 1→2)
- Typage strict via interfaces (SearchResult et sous-types, RestoreResponse, ExportCardConfig, ParsedCSV) — pas de `any`
- Convention d'imports respectée : PageHeader, EmptyState, apiFetch/photoUrl, utils (cn/formatMoney/formatDateTime/formatNumber), export (downloadExcel/printHTML), shadcn Card/Button/Badge/Input/Label/Skeleton/Collapsible/Dialog, lucide-react, sonner

---
Task ID: 13
Agent: main (orchestrator) — vérification finale
Task: Assemblage, lint, serveur dev, vérification Agent Browser end-to-end

Work Log:
- Corrigé 2 erreurs TS signalées : backup/route.ts (Buffer -> Uint8Array cast BodyInit), export/route.ts (ajout include items sur le branch accounting)
- Retiré directive eslint-disable inutilisée dans PhotoUpload.tsx
- `bun run lint` -> 0 erreur, 0 warning
- `tsc --noEmit` -> 0 erreur sur le code applicatif (src/); les 4 erreurs restantes sont dans examples/ et skills/ (hors application)
- Serveur dev démarré sur port 3000, compile sans erreur fatale
- Vérification Agent Browser end-to-end :
  1. Page / se charge, sidebar 16 modules, dashboard affiché avec états vides (app 100% vide au 1er lancement)
  2. Console propre, 0 erreur runtime
  3. Création catégorie "Plats" (🍗) -> OK, card affichée
  4. Création plat "Kedjenou poulet de chair" 2500 FCFA -> OK
  5. Caisse (Ventes > Nouvelle vente) : ajout du plat au panier, enregistrement vente -> OK, bascule auto sur Historique
  6. Dashboard reflète la vente : CA 2 500 FCFA, Bénéfice 2 500 FCFA, "Top plats: Kedjenou poulet de chair"
  7. Recherche instantanée "kedj" -> 1 résultat (plat trouvé), groupes repliables
  8. Mode sombre -> OK
  9. Vue mobile 390x844 -> menu hamburger ouvre la sidebar (Sheet) -> OK, responsive
- Aucune boucle de fetch infinie (les requêtes répétées en dev.log étaient dues au HMR pendant l'écriture des fichiers par les sous-agents)

Stage Summary:
- Application ELISHAMA complète et opérationnelle, vérifiée dans le navigateur
- Flux doré validé : catégorie -> produit/plat -> vente -> dashboard
- 16 modules fonctionnels, UI française, thème restaurant orange/ambre, responsive + dark mode
- 100% personnalisable, vide au premier démarrage (aucune donnée imposée)

---
Task ID: 14
Agent: main (orchestrator) — Support PWA + Guide installation
Task: Rendre l'application installable (PWA) et créer le guide d'installation hors connexion

Work Log:
- Créé logo ELISHAMA SVG (carré arrondi orange gradient + "E" + ustensiles)
- Généré icônes PNG via sharp : icon-192.png, icon-512.png, apple-icon.png, favicon-32/16.png, favicon.ico
- Créé public/manifest.json (name, short_name, start_url /, display standalone, theme_color #f97316, icons SVG+192+512 maskable, shortcuts Tableau de bord / Nouvelle vente)
- Créé public/sw.js (service worker) : precache shell, API network-first + fallback cache, uploads cache-first, navigation/assets stale-while-revalidate
- Créé src/components/shared/PWARegister.tsx (enregistrement SW côté client au load)
- Mis à jour src/app/layout.tsx : metadata.manifest, icons (ico/svg/png), appleWebApp, viewport.themeColor, import PWARegister
- Créé GUIDE-INSTALLATION.md (prérequis Node/Bun, installation projet, lancement dev/prod, installation PWA Windows/Android/iOS, démarrage auto Windows .bat, sauvegarde, mises à jour, dépannage)
- Créé demarrer-elishama.bat (script Windows double-clic pour lancer l'app)
- Vérification Agent Browser : SW enregistré (1 registration, scope /), manifest lié, /sw.js /manifest.json /icon-192.png servis en 200, 0 erreur runtime
- lint : 0 erreur, 0 warning

Stage Summary:
- Application ELISHAMA désormais installable comme PWA (icône bureau Windows, fenêtre standalone, écran d'accueil Android/iOS)
- Fonctionnement 100% hors connexion : toutes données en SQLite local + photos locales, service worker cache le shell et les assets
- Guide d'installation complet fourni (GUIDE-INSTALLATION.md) + script .bat de démarrage automatique Windows
- Pour utiliser hors ligne : lancer le serveur Next sur la machine (npm run start) → ouvrir localhost:3000 → installer via navigateur
