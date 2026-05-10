# Financial Position — tabbed list editor

A new shared component that surfaces the financial parts of the fact find as four underline-style tabs (**Employment**, **Assets**, **Liabilities**, **Income**), each rendered as collapsible groups with totals and "+ Add" buttons. Reads and writes the existing `fact_find_responses` rows — no DB changes.

## What gets built

### 1. Shared component — `src/components/financial-position/FinancialPositionEditor.tsx`
- Loads all relevant `fact_find_responses` rows for a `leadId` once, keeps them in local state, debounced upsert per section on edit (same pattern as the wizard).
- Header row (like the screenshot): big icon + "Financials" + inline summary chips (`Net Worth`, `Total Income`).
- Underline tab bar (custom, matches screenshot — uppercase, letter-spaced, active tab gets a primary-colored underline + bolded text). No pill background.
- Props: `{ leadId, token?, readOnly?, isPreviewMode?, onChange? }`. `token` path uses the existing `client-portal` edge function for client-portal saves; broker path writes directly to `fact_find_responses`.

### 2. Tab content components (in same folder)
Each is a list of **collapsible group rows** matching the second screenshot: chevron, group label, "Total $X", and a dashed "+ Add …" button on the right. Expanding shows item rows with inline edit + remove.

- `EmploymentTab.tsx` — groups: **Primary applicant employment**, **Second applicant employment** (only when `mff_welcome.has_second_applicant === 'yes'`). Each group is a flat editable form (re-uses existing field config) rather than a list, since employment is one-per-applicant.
- `AssetsTab.tsx` — groups:
  - Owner-occupied home (single item from `mff_re_home`)
  - Investment properties (list from `mff_ip_1..9`)
  - Savings accounts (list from `mff_savings_1..6`)
  - Vehicles (list from `mff_vehicle_1..3`)
  - Other assets (super, shares, crypto, contents — from `mff_other_assets`)
- `LiabilitiesTab.tsx` — groups: Home loan, IP loans (derived from same `mff_ip_*`), Vehicle finance, Credit cards (`mff_liab_cards.credit_cards[]`), Personal loans (`mff_liab_personal.personal_loans[]`), Other loans + BNPL (`mff_liab_other`), HECS / tax debt (`mff_liab_hecs`).
- `IncomeTab.tsx` — groups per applicant: Salary & PAYG, Rental income (auto-summed from IPs), Government benefits, Investment income, Business income, Other.

"+ Add" appends a new item to the appropriate repeatable array or unlocks the next numbered section (e.g. setting `has_another_property = 'yes'` on the previous one and creating `mff_ip_{n}`).

### 3. Reusable list-row primitives — `FinancialGroupCard.tsx`, `FinancialItemRow.tsx`
Collapsible card matching screenshot: muted background, large total in primary colour, dashed-border "+ Add" button, smooth chevron rotate.

### 4. Integration points
- **Broker lead card** (`src/components/lead/FinancialSnapshot.tsx`): add a "Open financial position" button that opens the new editor in a dialog (alongside the existing "Edit financial position" wizard button — keep both for now).
- **Client / broker fact-find**: in `MortgageFactFindWizard.tsx`, add a top-right toggle ("Step view" ↔ "List view"). List view renders `<FinancialPositionEditor>` filling the wizard surface; step-view keeps current linear flow. Saves to the same rows so switching is lossless.

### 5. Aggregates
Pull `Net Worth` and `Total Income` for the header chips from existing `computeFactFindAggregates()` in `src/lib/factFindAggregates.ts` — no new math needed.

## Out of scope
- DB schema changes (none — uses existing `fact_find_responses`).
- Touching personal/address/lending sections of the fact find (only Employment + financial position).
- Changing the broker `FinancialSnapshot` summary card itself.

## Files added
```text
src/components/financial-position/FinancialPositionEditor.tsx
src/components/financial-position/FinancialGroupCard.tsx
src/components/financial-position/FinancialItemRow.tsx
src/components/financial-position/EmploymentTab.tsx
src/components/financial-position/AssetsTab.tsx
src/components/financial-position/LiabilitiesTab.tsx
src/components/financial-position/IncomeTab.tsx
src/components/financial-position/UnderlineTabs.tsx   // tab bar matching screenshot
src/components/financial-position/sectionMappers.ts   // read/write helpers per group
```

## Files edited
- `src/components/lead/FinancialSnapshot.tsx` — add button + dialog hosting the editor.
- `src/components/mortgage-factfind/MortgageFactFindWizard.tsx` — add Step/List toggle.

## Approve to proceed
Reply **yes** to build, or tell me what to change (e.g. drop the wizard toggle, hide Employment behind a per-applicant sub-tab, different field set).
