# Entity & Income Flow Map on the Client Card

A new "Business Structure" section on the deal/client card that maps self-employed clients' entities (trusts, companies, partnerships, SMSFs, individuals), who controls them, and how income/distributions flow between them — so servicing income can be traced end to end.

## What you'll be able to do

1. **Add entities** to a deal: Individual, Company (Pty Ltd), Discretionary/Unit Trust, Partnership, SMSF.
   Each entity records: name, type, ABN/ACN, trustee (which entity acts as trustee), financial-year-end, and notes.
2. **Add relationships** between entities: director, shareholder (with %), beneficiary, unit holder, trustee, appointor, partner, employee.
3. **Add income flows** per financial year: from entity → to entity, with amount, type (trust distribution, dividend, wages/PAYG, director fee, partnership share, net profit retained), and whether it's used for servicing.
4. **See a visual map**: boxes for each entity, arrows for distributions/wages, dollar amounts on the arrows, colour-coded by entity type. Zoom/pan, click a node to edit.
5. **Servicing summary**: total income landing on each *individual applicant* for the selected FY, split by income type, with a warning when money is distributed to an entity that isn't an applicant (i.e. not usable income) or when a flow loops between trusts.
6. **Trace a dollar**: click any applicant to highlight the upstream chain (trading co → trust → second trust → applicant).

## Structure the map supports (your example)

```text
  Trading Business (Pty Ltd)  --net profit-->  Family Trust A
        ^ director: Client                          |
                                                    |-- distribution $60k --> Client (applicant)
                                                    |-- distribution $40k --> Family Trust B
                                                                                  |
                                                                                  |-- distribution --> Spouse
```
Trust A's trustee is a corporate trustee entity; beneficiaries and directors are recorded on the entity, and the second-tier trust distribution is a normal flow row so nothing gets lost.

## Technical plan

**Database** (three new tables, all scoped by `lead_id` with RLS mirroring the existing lead-access policies + GRANTs):
- `lead_entities` — id, lead_id, name, entity_type, abn, acn, trustee_entity_id (self-FK), is_applicant, fy_end, notes, position_x/position_y (for map layout), sort_order.
- `lead_entity_roles` — id, lead_id, entity_id, person_entity_id (nullable), person_name, role, percentage.
- `lead_entity_flows` — id, lead_id, from_entity_id, to_entity_id, financial_year (e.g. 2025), amount, flow_type, use_for_servicing, notes.

**Frontend**
- `src/components/lead/entity-map/EntityMapSection.tsx` — SectionCard wrapper, FY selector, tabs: Map / Entities / Flows.
- `EntityMapCanvas.tsx` — SVG/absolute-positioned nodes with draggable positions (persisted to position_x/y) and curved arrows with amount labels. No new heavy dependency; built with the existing drag patterns used in the Kanban.
- `EntityDialog.tsx`, `FlowDialog.tsx`, `RolesEditor.tsx` — CRUD forms.
- `src/lib/entityMap/servicing.ts` — pure functions: resolve flows per FY, aggregate income per applicant, detect circular/dead-end distributions, produce the trace chain. Unit-tested with vitest.
- Hook `useLeadEntities(leadId, fy)` for fetch/mutate + realtime-free refresh, matching existing component patterns.
- Rendered inside `LeadDetailSheet` as a new collapsible SectionCard (default collapsed), placed just above the Financial Snapshot.

**Not in this pass**: parsing uploaded tax returns automatically, and PDF export of the map. Both are natural follow-ups — if you upload a couple of returns after this is in, I can add extraction that pre-fills entities and flows.
