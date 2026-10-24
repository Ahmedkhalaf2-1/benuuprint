# Frontend Phase 2A — Customers & Brands

Scope: Customers (list, create, edit, detail, archive/restore, status), customer contacts and addresses, Brands (per-customer list, create, edit,
detail, archive/restore). Nothing from Samples / Orders / Quotations / Payments / Master Data.

## Live API contracts used (verified against OpenAPI and the live backend)
| Purpose | Route | Notes |
|---|---|---|
| List customers | `GET /admin/customers` | `page`, `pageSize` (max 100, else 400), `search` (number, name, email, phone, WhatsApp, active brand names), `status` (ACTIVE/LEAD/INACTIVE/BLOCKED/ARCHIVED), `includeArchived`, `sortBy` (`createdAt`/`displayName`/`customerNumber`), `sortOrder`. Archived hidden by default. Rows have **no brand count**. |
| Customer detail | `GET /admin/customers/:id` | Includes `brands` (summary, live only), `contacts`, `addresses`. |
| Create / update | `POST /admin/customers`, `PATCH /admin/customers/:id` | Create: `displayName` required (2+), optional `email phone whatsapp country city instagram source notes status`. Update: same minus `status`; `null` clears an optional field. Email lower-cased and phone normalised by the server (`0100 123-4567` → `01001234567`). Names are **not** unique. |
| Archive | `DELETE /admin/customers/:id` (204) | Soft; also archives live brands. Archived customers can't be edited (409) or get brands (409). |
| Restore / status | `PATCH /admin/customers/:id/status {status}` | Any status on an archived customer restores it; its brands stay archived. |
| Contacts | `GET/POST /admin/customers/:id/contacts`, `PATCH/DELETE /admin/customer-contacts/:id` | Roles OWNER/PRODUCTION/FINANCE/SHIPPING/OTHER; one primary (new primary demotes the old). DELETE = archive. |
| Addresses | `GET/POST /admin/customers/:id/addresses`, `PATCH/DELETE /admin/customer-addresses/:id` | Types BILLING/SHIPPING/PICKUP/OTHER; required `country city addressLine1`; one default per type. |
| Brands of a customer | `GET /admin/customers/:id/brands` | `page pageSize search status(ACTIVE/INACTIVE/ARCHIVED) includeArchived`. **There is no global brand list endpoint.** |
| Brand | `POST /admin/customers/:id/brands`, `GET/PATCH/DELETE /admin/brands/:id` | `name` required, optional `instagram website(http/https) description primaryColor secondaryColor(#RRGGBB) status(ACTIVE/INACTIVE)`. Live name unique per customer, case-insensitive (409 `This customer already has a brand named "…"`). Restore = `PATCH {status}` on an archived brand (409 while the customer is archived: "Restore the customer before restoring its brands"). A brand cannot be moved to another customer. |
| Errors | 400 `message: string[]` of `"<field> <problem>"`; 404 "Customer not found"; 409 strings; 403 `Insufficient permissions` | mapped by `lib/forms/api-errors.ts`. |

## Routes
`/customers` · `/customers/new` · `/customers/[id]` · `/customers/[id]/edit` · `/brands` (customer chooser + that customer's brands) ·
`/brands/new?customerId=` · `/brands/[id]` · `/brands/[id]/edit`.

## Customer list
`features/customers/customers-page.tsx` on the Phase 1 `DataTable`. Columns (all real fields): number, name (link), email, phone, WhatsApp, location
(city, country), status, created. Search box (debounced 300 ms), Status select, Include-archived switch, Sort select (also sortable headers). All state is in the URL:
`?search=&status=&includeArchived=true&sortBy=&sortOrder=&page=&pageSize=`; changing anything but `page` resets to page 1. Nothing is filtered client-side.
No date-range or brand filter exists in the API, so none is offered. Distinct empty states: "No customers yet" (with New customer) vs "No matching customers" (Clear filters).
Row menu: View, Edit, Archive (confirm) or Restore. No bulk actions (no bulk endpoints).

## Forms
React Hook Form + Zod (UX validation only; phone/email normalisation is **not** duplicated). Backend 400 messages are mapped to fields by their leading
property name; unmapped errors (409/429/5xx) appear as a form alert with the request id. Dirty edit forms warn on tab close / reload (`useWarnUnsaved`),
the Save button is disabled while pristine or pending. Contacts and addresses use dialogs on the detail page. Create omits empty optionals; update
sends `null` for cleared ones and never sends `status` (changed through the Status menu).

## Customer detail
`DetailHeader` (reference, name, status badge, actions) + `InfoGrid` (generic, reusable for samples/orders/jobs). Sections: Overview, Brands
(`GET …/brands`, "Show archived" toggle, View/Edit/Archive/Restore, Add brand), Contacts, Addresses (own list queries and keys). Status menu changes
status or archives; archived customers show a banner, Restore, and no edit/add controls. There is no activity stream or file list in the API for this
phase, so none is shown.

## Brands
Because brands are only listable per customer, `/brands` shows a remote-search `CustomerPicker` (10 results per search, never the whole table) and then
that customer's paginated brand table; the selected customer is `?customerId=` in the URL. Create requires a customer (picker, or pre-filled from
the customer page); edit shows the customer read-only. Detail shows brand fields, colour swatches and the customer summary. A 409 duplicate name appears under the name field.

## Query keys & invalidation (`lib/query/keys.ts`)
`customers.list(params)`, `customers.detail(id)`, `customers.options(search)`, `customerContacts.list(id)`, `customerAddresses.list(id)`,
`brands.list(customerId, params)`, `brands.detail(id)`. Mutations invalidate only what they touch: customer create/update → customer lists (+ detail cache set); archive → lists, detail and
that customer's brand lists; status → lists + detail; contact/address → their own list; brand → that customer's brand lists, customer detail and the brand.

## Permissions (verified live)
Codes: `customers.read` (view) and `customers.manage` (create, edit, archive/restore, contacts, addresses, **and brands** — brands have no codes of their own).
| Role | Customers & brands |
|---|---|
| SUPER_ADMIN | read + manage |
| SALES | read + manage (list, detail, create, patch, brand archive all 2xx) |
| QC | none: every customer/brand route returns 403; Customers and Brands are hidden from the sidebar, direct URLs show **Access denied**, the user stays signed in |
The UI hides New/Edit/Archive/Restore/Add without `customers.manage` and gates `/customers/new`, `/…/edit`, `/brands/new`, `/brands/[id]/edit` with Access denied; the backend stays authoritative.

## Responsive
Verified with a real browser at 1440 / 1024 / 768 / 390: no page-level horizontal overflow on list, detail, brand form and brands pages. Tables scroll inside their card; filters wrap;
detail cards stack. (A hidden screen-reader cell inside the scrolling table used to widen the page; the scroller is now `relative` so it is clipped.)

## Tests (`pnpm test`, 106 total; 39 new for 2A)
`customers.test.tsx` — list (data, default/URL sort + filters forwarded, server pagination, URL-driven filter reset, two empty states, loading, 500, 403, permission hiding, restore, archive confirm),
form (validation, raw phone sent, 400 → fields, 429 alert, edit nulls), detail (summary/contacts/addresses/brands, read-only, archived, 404, 403, contact create, address field error).
`brands.test.tsx` — list (needs customer, customer in path not query, empty, restore 409, archive confirm), form (customer required, create, 409 on name, colour/website validation, edit fixed customer), detail (view, archived, read-only, 403, 404).
`transient-refresh.test.ts` — 429/5xx/network on refresh never sign out.

## Known limitations
* No global brand list/search in the API: `/brands` is customer-first. Recommend `GET /admin/brands?search=&customerId=` for a backend phase.
* Customer list rows have no brand count; search does match brand names.
* Contacts/addresses cannot be restored once archived (no API); the UI only archives.
* No unsaved-change prompt on in-app navigation (only tab close/reload); dialog forms warn nowhere.
* Customer notification preferences (`/admin/customers/:id/notification-preferences`) are not exposed yet.
* Dev data created while testing is prefixed `ZZ` and archived, not deleted (the API only soft-archives).
