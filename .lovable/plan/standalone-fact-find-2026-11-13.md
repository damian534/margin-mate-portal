# Standalone Fact Find

## Scope
Build a new **Fact Find** section with its own navigation item and routes, leaving existing document collection and the existing fact-find wizard unchanged. Deliver it in five phases, with a test checkpoint after each phase rather than enabling an unfinished questionnaire for clients.

## Experience
- Design first at 390px: calm white space, restrained colour, large tap targets and the existing client-facing font.
- One question or small group per screen, a back arrow, slim progress bar and bottom-pinned Continue button that stays clear of phone safe areas and keyboards.
- Plain-English questions, choice chips, currency formatting and month/year history inputs.
- Save answers as clients go; show Saved only after a successful save. Resume from the saved screen through the same private link.
- Keep uploaded screenshots as references, not images inside the app.

## Phase 1 — Consent and flow shell
- Add the standalone broker section and applicant-specific client links, separate from document links.
- Add a welcome/consent screen with the two specified checkboxes and typed full name. Neither Continue nor the server will accept missing consent.
- Save immutable consent evidence per applicant: typed name, acceptance time, server-observed IP, user agent, version and exact privacy wording accepted.
- Give joint applicants separate consent records; support their own links and an explicit same-device handover without treating one person's consent as both applicants' consent.
- Add saved progress and exact resume position, retryable save failures and invalid/expired-link states.
- Provide a clearly identified test experience while remaining phases are being built; do not mark a shell as a completed or submitted fact find.
- Use the brokerage's configured name. **Approved Privacy Policy and Credit Guide links were not supplied:** allow the broker to configure them and keep real consent disabled until both exist. Draft summary wording requires business review before client use; do not invent legal documents or claim compliance.

**Checkpoint:** Phone and desktop review, mandatory-consent tests, per-applicant isolation, save/reopen readback and visible consent evidence.

## Phase 2 — About you and three-year histories
- Collect single/joint application details, DOB, contact details, marital/residency status and dependants with ages.
- Collect current and previous addresses, move-in/out month and year, and living situation; request Australian address suggestions with a manual-entry fallback if the service is unavailable.
- Collect employment and income, including self-employment/business details and optional other income. Unemployment, study and parental leave count as history entries.
- Show covered years/months. Block progress until each applicant has at least 36 continuous months of both histories; name missing date ranges and reject invalid/overlapping periods rather than adding overlapping months twice.

**Checkpoint:** Concrete 36-month boundary, gap, overlap and leave/study tests; client flow and resume with saved history.

## Phase 3 — Assets and liabilities
- Add repeatable mini-forms for Property, Savings, Vehicle, Super, Shares/Investments and Other.
- A property or vehicle loan creates one liability linked to that asset; edits update that liability and removing the loan removes the linked debt without duplicating entries.
- Add other debt cards; credit cards use the credit limit, loans use amount owed and monthly repayments.
- Display linked debts read-only with Edit on asset; include No other debts.

**Checkpoint:** Property/mortgage and vehicle/car-loan linking, edit/removal and duplicate-prevention tests with saved readback.

## Phase 4 — Expenses, review and submit
- Collect the eight requested monthly expense groups with a running total.
- Present section summaries with tap-to-edit and net position: assets minus debt, using credit-card limits for credit-card exposure.
- Submit only after the server checks each applicant's consent, required answers and both history gates. Freeze the submitted evidence; repeated taps must not duplicate submissions or notifications.
- Show confirmation and notify the owning broker using the existing email service.

**Checkpoint:** Full phone flow, server rejection of incomplete submissions, summary totals, submitted readback and confirmed broker notification.

## Phase 5 — Broker view and PDF
- Add a Fact Find tab to deal/client files and a searchable standalone list: Not started, In progress with percentage, Submitted.
- Provide a clean read-only summary and prominent consent evidence including name, timestamp and IP. Evidence does not itself declare that a credit check is legally authorised.
- Send/resend applicant-specific links by email and SMS using existing verified sending services; surface missing SMS setup instead of pretending delivery occurred.
- Export a branded printable PDF with consent and financial summaries; inspect rendered PDF pages before delivery.

**Checkpoint:** Broker access isolation, invitation delivery, joint links, printable summary and visually checked PDF.

## Technical approach
- Keep the new module and data separate from `fact_find_responses`, existing document tokens and manual deal creation. Link it to existing deals and saved applicants without creating a new user profile system.
- Use dedicated fact-find, applicant, consent, address, employment, asset, liability and expense records, plus revocable applicant-scoped link capabilities. Store only link hashes, keep raw links out of logs and exclude unrelated applicant details from link responses.
- Enable broker-scoped access policies and explicit table grants; validate public link operations server-side. Brokers cannot create client consent evidence themselves.
- Use small shared schemas and pure helpers for progress, month coverage, asset/debt linking and totals, with focused tests beside existing tests.
- Serialize autosaves and preserve dirty answers during slow responses; flush pending edits before moving screens or submitting.
- Record the accepted legal-text version/snapshot on each consent, so later text edits do not change historical evidence.
- Discover existing address-autocomplete support before choosing a service; any required connection will use the app's existing integration process.

## Delivery boundary
Begin with phase 1, then pause for your test feedback before adding phase 2. Existing document collection continues working throughout.