# Broker-side Client File (tabbed client portal)

Today the client record is one long scrolling sheet of stacked cards. This restructures it into a tabbed client file — the view a broker works from — matching the industry layout (Summary / Clients / Addresses / Employment & ID / Financials / Privacy Consent / Lending / Notes / Communications).

Most of the underlying data already exists (fact find responses, applicants, contacts, documents, loan splits, notes, entity map). This is mainly about surfacing it properly, plus three genuinely new pieces: addresses as structured records, privacy consent tracking, and a communications log.

## Tab structure

| Tab | Contents | Data source |
| --- | --- | --- |
| Summary | Snapshot: client name, status/WIP stage, loan amount, lender, key dates, next task, doc progress, quick actions | existing lead fields, rolled up |
| Clients | All applicants and co-applicants with personal details, dependants, contact details, ID | `lead_applicants`, `contacts`, fact find personal section |
| Addresses | Current + previous addresses per applicant, with duration and ownership status | new `lead_addresses` table, seeded from fact find |
| Employment / ID | Employment history per applicant, income breakdown, ID documents verified | fact find employment section + `document_requests` |
| Financials | Assets, liabilities, living expenses, servicing snapshot, entity/income map | fact find + existing `FinancialPositionEditor` and entity map |
| Privacy Consent | Consent status per applicant, date captured, source (portal/manual), credit guide issued | new `lead_consents` table |
| Lending | Loan splits, lender, pre-approval, subject-to-finance, settlement | existing components moved here |
| Notes | Existing notes timeline, pinned notes, meeting notes | `notes`, `meeting_notes` |
| Communications | Every email sent (milestone, fact find, MIR, finance extension), plus manual log entries for calls/SMS | new `lead_communications` table + backfill from existing send tables |

## Design

Horizontal tab strip across the top of the client sheet, uppercase labels, active tab underlined — same visual language as the rest of the app (Poppins, white background, semantic tokens). Tabs scroll horizontally on narrow screens. Tab state is remembered per client while the sheet is open.

An overflow menu at the right of the strip holds record-level actions (send fact find, generate portal link, download all docs, refer lead, delete).

## Technical notes

- New tables, all `broker_id`-scoped with RLS matching the existing `can_manage_lead` pattern and explicit GRANTs:
  - `lead_addresses` — applicant_id, address, type (current/previous/mailing), duration, ownership status, order
  - `lead_consents` — applicant_id, consent_type, granted, granted_at, captured_via, evidence
  - `lead_communications` — direction, channel (email/call/sms/meeting), subject, body/summary, recipient, occurred_at, related resend id
- `LeadDetailSheet.tsx` (2,474 lines) is split: a shell that owns lead state + tabs, and one component per tab under `src/components/lead/tabs/`. Existing section components are re-used as-is, just relocated into tabs — no rewrite of their logic.
- Communications tab reads a unified view over `email_campaign_sends`, `mir_requests`, `lead_finance_extensions` and `document_reminder_sends` plus manual `lead_communications` rows, sorted by time.
- Addresses/consents read from fact find JSON on first load and write into the new tables, so nothing already captured is lost.

## Out of scope for now

Client-facing self-service portal, white-label branding per broker, and the wider aggregation platform features — worth a separate pass once this client file is solid.
