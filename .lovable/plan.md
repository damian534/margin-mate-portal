## Goal
Make the "client card" feel modern, minimal, and surface a clear read of the client's financial position across all three places they appear.

## Scope (3 surfaces)

### 1. Lead Detail Sheet (the main client card)
This is the biggest visual change.

**New hero header**
- Larger circular avatar (initials), name in display weight, inline pencil edit
- Status pill (color from `lead_statuses`) right under the name
- Subtle muted line: loan purpose · created date · source
- One-line "Refer this lead" + delete moved into a quiet kebab menu

**Financial snapshot strip (3 KPI tiles, immediately under hero)**
- **Loan Amount** — formatted `$1,250,000`, with loan purpose chip
- **Est. Commission** — sum of upfront + trail projections (uses `lead.referrer_commission` + standard 0.65% fallback if blank), labelled "Pipeline value"
- **Position** — Net = Assets − Liabilities, pulled from `fact_find_responses` (assets/liabilities sections). Shows "—" when no fact-find yet, with a subtle "Invite to fact-find" link.

**Full Position card (collapsible, below tabs)**
A clean grid summarising fact-find data when present:
- Total Income (annual)
- Total Assets
- Total Liabilities
- Net Position (green/red)
- Estimated LVR (loan_amount ÷ assets) with a thin progress bar

If no fact-find data: empty state with a CTA to send the fact-find.

**Polish**
- Tighter spacing, single divider system, Poppins weights tuned (600 for name, 500 for KPI values, 400 muted labels)
- Replace the bordered grey panels with hairline cards (`border border-border/60 rounded-xl`)
- Quick-actions row (Email, Call, Send Documents) becomes icon-only ghost buttons in the hero

### 2. Lead Kanban card
- Bigger name (font-medium → font-semibold), avatar initial circle on the left
- Loan amount becomes the primary metric (right-aligned, tabular-nums)
- Loan purpose + source as small chips on one row
- Referral attribution becomes a single muted footer line
- Subtle hover lift (shadow-sm → shadow-md, translate-y)

### 3. Contacts list
- Keep the table for density, but upgrade row styling: avatar circle in name cell, type chip uses semantic color, hover row gets a subtle primary tint
- Contact detail Sheet gets the same hero treatment as the Lead sheet (avatar + name + type pill + quick actions)

## Technical notes
- Pull fact-find totals via a small helper that reads `fact_find_responses` for the lead and sums numeric fields in `assets`, `liabilities`, and `income` sections (data is `jsonb`, already shaped by the wizard).
- All colors via semantic tokens (`text-success`, `text-destructive`, `bg-muted/40`, `border-border/60`) — no raw hex.
- No DB changes. No business logic changes. Pure presentation + a read-only fact-find aggregation helper.

## Out of scope
- Editing fact-find data from the card (still done in the wizard)
- Charts/graphs (kept minimal per your "modern minimal" preference)
- Changing the Kanban board layout, only the card inside it