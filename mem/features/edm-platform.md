---
name: EDM Platform
description: Internal email marketing — tag-based audiences, Resend send engine, campaign log
type: feature
---
Internal EDM lives under the "Email Campaigns" tab in `/admin`.
- Contacts and partner profiles carry `audience_tags text[]` (values: `investor`, `home_owner`) and `email_opt_out bool`.
- Campaigns table `email_campaigns` (broker-scoped via `get_my_broker_id`); per-recipient log in `email_campaign_sends`.
- Sending goes through edge function `send-edm` -> Resend connector gateway. Throttled ~5/sec.
- Merge tags supported in subject/body: `{{first_name}}`, `{{last_name}}`, `{{full_name}}`, `{{email}}`.
- Default From: `Margin Connect <onboarding@resend.dev>` until a domain is verified in Resend.
- Tag picker lives in the Contact detail sheet (`ContactsManagement.tsx`).