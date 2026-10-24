# Frontend Phase 2B.1 — Master Data (read-only)

Read-only screens for the reference data that Samples (2B.2) depend on. No create/edit/archive UI, no Sample code.

## Routes
`/master-data` (overview) · `/products` + `/products/[id]` · `/fabrics` + `/fabrics/[id]` · `/sizes` · `/print-methods` · `/accessories` · `/components`
(Labels & Packaging) · `/patterns` + `/patterns/[id]` · `/configurator` (all under `/master-data`). A tab-style section nav (`master-nav.tsx`, real links, `aria-current`)
is rendered by `app/(admin)/master-data/layout.tsx`.

## Live API contracts (verified against OpenAPI and the live backend)
| Resource | List | Detail | Notes |
|---|---|---|---|
| Product types | `GET /admin/product-types` | `GET …/:id`, fabrics: `GET …/:id/fabrics` | `category` TOPS/BOTTOMS/OUTERWEAR/HEADWEAR/DRESSES/OTHER; `defaultSampleFee` (decimal string, shown as returned) |
| Fabrics | `GET /admin/fabrics` | `GET …/:id`, colours: `GET …/:id/colors` | list rows embed `colors[]` (id,name,hex,isAvailable) and `productTypes[]` (isRecommended,isAllowed,notes); GSM min/max/default, composition |
| Fabric colours | (via fabric) | — | `name, internalCode, hex, pantone, swatchAssetId, isAvailable, isActive`; **hex/pantone may be null** |
| Size scales | `GET /admin/size-scales` | list embeds `sizes[]` (code,name,sortOrder) | no separate size-option read route is needed |
| Print methods | `GET /admin/print-methods` | — | `type` PRINT/EMBROIDERY/OTHER, `supportsFullColor`, `maxColors`, `minQuantity`, `setupFee` (decimal string) |
| Accessories | `GET /admin/accessories` | — | `category` is free text, `unit` |
| Components | `GET /admin/component-options` | — | `category` LABEL/PACKAGING/OTHER |
| Patterns | `GET /admin/patterns` (`status` DRAFT/ACTIVE/ARCHIVED, `productTypeId`, `search`, `includeArchived`; **no sorting, no isActive**) | `GET …/:id` incl. `versions[]` | `currentVersionId/Number` = the approved version; versions DRAFT/APPROVED/SUPERSEDED |
| Version files | `GET /admin/assets?targetType=PATTERN_VERSION&targetId=` | — | metadata only: **no storage key exists in the API** |
| Download | `GET /admin/assets/:id/download-url` → `{url, expiresAt}` | — | `url` is a **path on the backend host** (`/api/v1/storage/local/<token>`); see Private files |
| Configurator | `GET /configurator/sample-options` | — | `productTypes, fabrics(+colors,+productTypes), sizeScales(+sizes), patterns (approved versions only), printMethods, accessories, components, fitMethods, fabricProviders, decorationSides, measurementUnits, terms` |
All list endpoints (except patterns) take `page, pageSize(≤100), search, isActive, includeArchived, sortBy(sortOrder|name|code|createdAt), sortOrder`, plus `category`/`type`.

## Permissions (verified live)
Every route above needs **`master_data.read`**; file listing/download additionally needs **`assets.read`**. Pattern *reads* only need `master_data.read` (`patterns.manage`
is write-only), and `/configurator/sample-options` also works with `master_data.read`.
| Role | Result |
|---|---|
| SUPER_ADMIN | has `master_data.read/manage`, `patterns.manage`, `assets.*`: everything |
| SALES | `master_data.read` + `assets.read`: all pages, pattern files visible and downloadable |
| QC | `master_data.read` + `assets.read`: all pages, files visible (no manage rights) |
The sidebar item and the route guard use `master_data.read`. Without `assets.read` the pattern page makes no asset request and shows a neutral note. 403s never log out.

## Screens
* **Overview** – cards with real counts (`meta.total` of a 1-row page; archived excluded); a card degrades to "Unavailable" independently if its endpoint fails. No count endpoint exists.
* **Product types / fabrics / print methods / accessories** – `ReferenceListPage` on the shared `DataTable`: server search, `isActive`, include-archived, category/type filter, backend sorting; all in the URL. Empty states say "Master data is managed by authorized administrators." and never offer "create".
* **Product type detail** – properties + fabric guidance from `…/:id/fabrics`. **Fabric detail** – properties, colours, product compatibility.
* **Fabric colours** – `ColorSwatch`: hex chip when the hex is valid, otherwise a neutral **striped fallback** (never a guessed colour); always shows name, hex or "No colour value", Pantone and internal code; unavailable/archived colours are muted and labelled.
* **Compatibility** – `Compatibility` badge: Recommended (star), Allowed, Not allowed (ban), icon + text. A missing relationship means "no guidance". The UI states that guidance informs forms and does not forbid a selection.
* **Sizes** – one card per scale, options sorted by backend `sortOrder`, inactive options labelled. **Labels & packaging** – grouped by category (first 100 rows; notice if more).
* **Patterns** – table with reference, code, name, product type, fit, approved version ("None approved"), status, updated. **Detail** – identity + version timeline (newest first, status badge, "Current", dates, notes) and per-version files. An APPROVED version shows **"Pattern file attached"** or **"Approved, but no pattern file is attached"** (only displayed; the backend enforces the rule).
* **Configurator inspector** – every dataset with its count (expand to see rows), so Phase 2B.2 can see exactly what the form will receive.

## Private files
Files come from the asset list API (metadata only). Download = request `GET /admin/assets/:id/download-url` **on click**, resolve the returned path against the **API origin**
(`lib/api/assets.ts → resolveDownloadUrl`; resolving against the frontend origin would 404), open in a new tab with `noopener`. Nothing is stored, logged or constructed by hand; storage keys are not part of any type and a test asserts they never render.

## Reusable pieces for Phase 2B.2
* Hooks (`features/master-data/hooks.ts`): `useProductTypes`, `useProductType`, `useProductTypeFabrics`, `useFabrics`, `useFabric`, `useFabricColors`, `useSizeScales`, `usePrintMethods`, `useAccessories`, `useComponentOptions`, `usePatterns`, `usePattern`, `usePatternVersionAssets`, **`useConfiguratorOptions`** (all sample-form datasets in one request).
* Adapters (`adapters.ts`): `toOptions` → `{ value, label, hint, record }` (domain record preserved); `productTypeOptions`, `fabricOptions`, `colorOptions(fabric)`, `sizeOptions(options, scaleId)`, `patternOptions(options, productTypeId?)` (**value = the approved `patternVersionId`**, since samples pin the version), `printMethodOptions`, `accessoryOptions`, `componentOptions`, `choiceOptions`, `fabricsForProduct` (recommended first, nothing hidden unless `onlyAllowed`).
* Components: `ColorSwatch`, `OptionCard` (read-only, optionally selectable), `Compatibility`, `StatusBadge` (ACTIVE/INACTIVE/ARCHIVED/…), `DetailHeader`/`InfoGrid`, `ReferenceListPage`, `lib/api/assets.ts`.
* Query keys (`lib/query/keys.ts`): `masterData.productTypes/productType/productTypeFabrics/fabrics/fabric/fabricColors/sizeScales/printMethods/accessories/components`, `patterns.list/detail/versionAssets`, `configurator.sampleOptions`.

## Caching
Master data: `staleTime` 5 min, `gcTime` 30 min (refetched afterwards; never cached forever). Transactional data keeps the 30 s global default. No polling.

## Responsive & accessibility
Verified in a real browser at 1440 / 1024 / 768 / 390 on overview, products, fabrics, fabric detail, sizes, print methods, accessories, components, patterns, pattern detail and configurator: no page-level horizontal overflow; tables scroll inside their card; the section tabs scroll horizontally on small screens. Swatches have text labels, tables have captions/headers, compatibility and status use text + icon, download buttons are labelled with the file name.

## Tests (`pnpm test`: 144 total, 38 new)
`master-data.test.tsx` — navigation, overview counts/degradation, product types (data, params, empty, filtered-empty, error, detail, 404/403), fabrics (list, GSM, swatches, colours detail, fallback, compatibility, archived toggle), ColorSwatch, sizes order, print methods, accessories, component grouping, patterns (list, filters/unsupported params, empty, 403, version timeline, file attached/missing, signed download, no `assets.read`, no storage-key leak, 404), configurator inspector and adapters.
`download-url.test.ts` — API-origin resolution. `permissions.test.ts` — Master Data visibility.

## Known limitations / backend notes
* Dev DB has no patterns, colours or compatibility seeded; I created throw-away `ZZ…` rows through the real API to verify rendering, then archived/removed them (an uploaded PATTERN asset stays: the API refuses to archive assets on an approved version).
* The configurator omits unavailable colours and unapproved patterns (backend behaviour).
* No separate "size option" or "component" detail pages: the list responses already contain everything.
* Pattern list cannot be sorted server-side; accessory `category` is free text so there is no category filter.
* Signed download tokens embed the storage key in their payload (backend design); the frontend never parses or displays them.
* `pnpm typecheck` uses `tsconfig.typecheck.json` (ignores `.next/dev`), because Next 16.4's dev-server typegen emits an invalid validator once a nested `layout.tsx` exists; `next build` type-checks normally.
* Stale `.next/dev` after deleting a route can break the dev server's own types; `rm -rf .next/dev` fixes it.

## Phase 2B.2 dependencies (Samples)
Ready: product, fabric, colour, size, pattern (version-pinned), print-method, accessory and component options plus fit methods, providers, decoration sides, units and terms through `useConfiguratorOptions`; `ColorSwatch`/`OptionCard`; customer/brand pickers from Phase 2A.
Still needed: sample list/detail/action routes, artwork + file upload UI (private assets, multipart), the free-form custom colour fields, terms acceptance, and commercial permissions for quotations.
