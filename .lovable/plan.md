# Client Profile — a real page, not a deal side panel

Today clicking a contact opens a narrow side sheet with name, email, phone and a list of linked deals. Everything meaningful (addresses, employment, financials, structure map, documents, consents, communications) only exists inside the deal card. This plan makes the **client** the primary record, with the deals hanging off them.

## What you'll get

Clicking a contact name anywhere (Contacts list, deal card, co-applicant chips, search) opens a full-width **Client Profile** page at its own URL you can bookmark and share internally.

### Layout

```text
+--------------------------------------------------------------+
|  [Avatar]  Sarah Nguyen                     [Email] [Call]    |
|  Client · Added Mar 2024 · 3 deals · 1 settled  [New deal]    |
+--------------------------------------------------------------+
| OVERVIEW  DEALS  PROFILE  FINANCIALS  DOCUMENTS  ACTIVITY     |
+--------------------------------------------------------------+
| Left column (main)                | Right rail                |
|  ...tab content...                |  Key facts card           |
|                                   |  Linked people            |
|                                   |  Next actions / tasks     |
+--------------------------------------------------------------+
```

### Tabs

- **Overview** — snapshot: lifetime lending value, deals by stage, last contact, open tasks, quick facts (DOB, residency, employment type), and a timeline of the most recent activity across all their deals.
- **Deals** — every deal this person is on (as applicant, co-applicant or referrer), with stage, loan amount, lender and settlement date. Click through to the deal card.
- **Profile** — personal details, address history and employment/ID, pulled up from the deal-level tabs so they live on the person rather than one application.
- **Financials** — assets, liabilities, income position and the business structure map.
- **Documents** — all documents collected across every deal for this client, grouped by deal.
- **Activity** — unified notes, calls, SMS, emails and consent records across all their deals, plus a quick-log box.

### Behaviour

- Data is read across all deals linked to the contact, so a client with three applications shows one consolidated picture.
- Where a field exists on multiple deals, the most recent deal wins and older values are shown as history.
- Editing personal details on the profile updates the contact record; deal-specific data still edits inside the deal.
- Tenant scoping is unchanged — you only ever see clients within your own broker data.

## Technical approach

- New route `/clients/:contactId` rendered inside the admin shell, plus a `ClientProfile` page component.
- New `src/components/client/` folder: `ClientProfileHeader`, `ClientProfileTabs`, and one component per tab. Existing `lead/tabs/*` components are refactored to accept either a `leadId` or a `contactId` so they can be reused instead of duplicated.
- A `useClientProfile(contactId)` hook resolves the contact, every linked lead (`leads.co_applicant_contact_id`, `co_applicant_contact_id_2/3`, `source_contact_id`, `referred_by_contact_id`, plus name/email match), then loads addresses, applicants, documents, notes and communications for that lead set in batched queries.
- `ContactsManagement` row click navigates to the new route instead of opening the sheet; the sheet is reduced to a quick-peek or removed.
- `LeadDetailSheet` client name and co-applicant chips link to the client profile.
- No schema change is required for the first pass — everything is derived from existing tables. If you later want person-level data that outlives any deal (e.g. address history owned by the contact), that becomes a follow-up migration moving `lead_addresses` to a contact link.

## Out of scope for this pass

- Merging duplicate contacts.
- Client-facing login to this profile (this is the broker-side view).
