---
name: Whitelabel / multi-brokerage
description: Tenant model, per-brokerage branding, custom domains, seat-based pricing and provisioning for licensing Connect to other brokerages
type: feature
---

Connect is licensed to other brokerages as a whitelabel product.

- **Pricing**: $299/month per broker seat, $99/month per support staff seat. Seats are derived from `user_roles` within a tenant, not entered manually.
- **`tenants` table**: one row per brokerage — slug, name, logo_url, primary/accent colour (stored as raw HSL token strings, e.g. `142 72% 29%`), custom_domain, sender name/email, support email, status (`trialing` / `active` / `past_due` / `suspended`), owner_user_id, Stripe ids.
- **`profiles.tenant_id`** attaches every user to one brokerage; new signups inherit the inviting broker's tenant via `handle_new_user`.
- **Tenant resolution**: `TenantProvider` (`src/hooks/useTenant.tsx`) reads the signed-in user's tenant row, or falls back to the public `get_tenant_branding(_host, _slug)` RPC so login screens are branded pre-auth. Colours are injected into the existing CSS theme tokens — never hardcode brand colours.
- **Custom domain per tenant** was chosen over subdomains. DNS: A record → 185.158.133.1 plus `_lovable` TXT.
- **Logos** live in the private `tenant-branding` bucket under `<tenant_id>/`, surfaced via long-lived signed URLs stored on the tenant row.
- **Provisioning**: `provision-tenant` edge function (super admin only) creates the tenant + owner login, then clones the master brokerage's `lenders` (with LMI matrix), `document_templates`, `task_templates` and `milestone_email_templates`, and issues a starter staff invite code.
- **Suspension**: `TenantStatusGate` blocks the app for `suspended` tenants and shows a banner for `past_due`. Data is retained, never deleted.
- **Operator console**: Settings → Brokerages (super admin only) lists tenants, seat counts, MRR, and allows create/suspend.
- **Email**: each tenant needs its own verified Resend sending domain (`sender_domain_verified`), otherwise outbound client email falls back to the platform sender.
