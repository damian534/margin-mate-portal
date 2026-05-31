---
name: Competitions
description: Per-agency referral contests with prize, metric, date window, live leaderboard, and banner on partner dashboard
type: feature
---
Brokers can launch referral competitions scoped to a specific agency (company). Each competition has: name, prize (text + optional amount), metric (referrals / settled / loan_volume), start_date, end_date, is_active, optional description.

UI:
- Managed in Agency Profile → Competitions tab (CompetitionsManager.tsx) — create, edit, delete, with inline top-5 leaderboard per competition.
- Active competitions automatically render as a gold banner at the top of each participating agent's PartnerDashboard (CompetitionBanner.tsx), showing prize, countdown, top 3, and the viewer's own rank.

Data: `competitions` table, RLS scoped to broker_id (with staff inheritance via get_my_broker_id) plus partner read access via company_id membership in profiles. Standings are computed client-side from existing leads data filtered to the competition window.
