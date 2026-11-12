# Architecture rules
- E-sign forms fetch saved applicants on each opening through the shared section and a pure primary-first deduplication helper; contact documents use their primary deal only as the applicant source, preserving document ownership.
- Shared deal views support an explicit overdue-only colour mode using one pure date-only task predicate, keeping task highlighting consistent without changing other dashboards' stage aging.
- E-sign completion emails use the managed template sender with a document-specific idempotency key, trusted broker recipient and fresh all-signed check; conditional completion writes prevent duplicate activity during simultaneous signing.
- CRM dashboard membership uses a shared pure stage classifier honoring cross-dashboard assignments; Leads projects processing columns with namespaced keys, and status management shares the parent hook so saves update membership immediately without duplicating deals or workflows.
- LeadDetailSheet provides a lightweight Leads presentation using the same note/task handlers as the full WIP file, so both views share persisted activity without duplicate workflows.
- Client workflows enroll only on lead insertion with immutable step snapshots and one-use service-only dispatch tokens; sends recheck channel-specific consent and recipient opt-outs, while dry runs never send messages.
- Native releases bundle web assets through Capacitor; a separate pure configuration helper permits hosted live reload only with explicit opt-in, preventing store builds from loading the editor preview.
- New-lead SMS uses a lead-insert trigger and service-only unique jobs with one-use dispatch capabilities; Twilio calls stay server-side and settings/test actions verify broker ownership to prevent duplicate sends and cross-tenant access.
- Automatic settlements are created only by the lead-date database trigger with a unique lead link; CRM stage changes write the settlement date instead of inserting another row, preventing dual-path duplicates.
- Duplicate settlement cleanup archives original rows in a service-only table before merging metadata and deleting confirmed copies, preserving recovery and distinct loans.
- Actual-period lodgements use a pure recorded-date helper and remain separate from creation-month lead cohorts, so coaching totals include older leads without changing conversion figures.
- Lead Flow period calculations live in a pure date helper and use Australian financial-year quarters to keep report filtering independently testable.
- Lead Flow PDF exports consume the same filtered buckets and breakdowns as the screen, using the current tenant branding and embedded Poppins fonts to keep coaching documents consistent and printable.
- Post-meeting email editing uses Tiptap with sanitised HTML and Markdown draft storage, preserving compatibility with saved meeting notes while hiding raw formatting from users.
- Client-email generation reads finished notes and current deal/contact data under caller access policies at draft time, keeping internal notes separate and avoiding stale client details.
- Business Metrics funnel logic lives in a pure helper (src/lib/businessMetrics.ts); "options presented" uses leads.proposal_sent_date, stamped by a DB trigger on first move to proposal_sent, so the metric survives later stage changes.

- Authentication emails use the managed email SDK and scaffolded auth-email-hook, not database queues, so sending matches the project’s managed email service.
- Direct Facebook lead intake validates app-signed events, routes only configured Pages to their brokerage and atomically imports each Page/lead ID once; credentials remain server-only and Page management verifies owner roles.
