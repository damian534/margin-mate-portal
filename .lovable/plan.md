# Whitelabel Margin Connect (multi-brokerage SaaS)

Turn Connect into a product other brokerages can license under their own brand, on their own domain, billed per seat via Stripe ($299/broker, $99/support staff).

The data layer is already tenant-safe (every table is scoped by `broker_id` with row-level security), so this is a branding + tenancy + billing layer on top — not a rewrite.

## Phase 1 — Tenants

- New `tenants` table: business name, slug, logo URL, brand colours (primary/accent), sender name, sender email, support email, custom domain, status (`trialing` / `active` / `past_due` / `suspended`).
- `profiles` gets a `tenant_id`; every broker, staff member and referral partner belongs to exactly one tenant.
- New role `tenant_owner` (the brokerage principal). You stay `super_admin` across all tenants.
- New helper `get_my_tenant_id()` used by access rules, mirroring the existing `get_my_broker_id()` pattern.
- Existing Margin data is migrated into a first tenant so nothing changes for your team.

## Phase 2 — Branding everywhere

- A `TenantProvider` loads the tenant on sign-in and writes its colours into the app's theme variables.
- Logo component, login/register pages, sidebar, PDFs (funds position, fact find, suburb reports) and Resend emails all read from the tenant instead of hardcoded Margin assets.
- Tenant owners get a **Branding** section in Settings: upload logo, pick colours, set sender name/email and support email.
- New storage bucket for tenant logos.

## Phase 3 — Custom domains

- Each tenant stores its domain (e.g. `connect.acmefinance.com.au`).
- The app resolves the tenant from `window.location.hostname` before login, so the sign-in screen is already branded.
- Fallback: `?tenant=slug` and your own `super_admin` tenant switcher for support.
- Domains are pointed at the app in project settings (A record + verification TXT); we'll add an onboarding checklist screen showing the exact DNS records for each new client.

## Phase 4 — Seeding new tenants

- A `provision-tenant` backend function that, on signup, clones your master defaults into the new tenant: the 41-lender list with its LMI matrix, document templates, task templates, lead statuses, WIP statuses, lead sources, and milestone email templates.
- Creates the tenant owner account and their invite code in one step.
- Your existing Margin configuration becomes the master template set.

## Phase 5 — Stripe seat billing

- Stripe products: Broker seat $299/month, Support staff seat $99/month.
- Signup flow: create tenant → Stripe Checkout → on success mark tenant `active`.
- Seat count derives from `user_roles` within the tenant. Adding a broker or staff member updates the Stripe subscription quantity automatically; removing them decrements it.
- Invite redemption is blocked when the tenant has no paid seat available, with a clear "add a seat" prompt for the owner.
- Stripe webhooks keep tenant status in sync — `past_due` shows a banner, `canceled` suspends access (data retained, not deleted).
- A billing page for tenant owners: current seats, monthly total, invoices, manage payment method.

## Phase 6 — Your operator console

- A `super_admin`-only Tenants page: list all brokerages, seat counts, MRR, status; create/suspend a tenant; impersonate for support.

## Technical notes

- Access rules are extended, not replaced: current `broker_id` scoping stays, with a tenant check layered above it so no cross-brokerage read is possible even if a `broker_id` were guessed.
- Email deliverability: each tenant needs its own verified sending domain in Resend, otherwise their client emails go out branded as Margin. Phase 2 includes a per-tenant sender domain field and a verification status indicator.
- The MCP integration and client portal links also become tenant-aware so branded portals stay on the client's domain.

## Suggested order

Phases 1–2 give you a working whitelabel you can demo. Phase 4 makes onboarding one click. Phase 5 makes it a business. I'd ship 1–2 first and get a pilot brokerage on it before wiring billing.
