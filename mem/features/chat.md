---
name: Connect Chat
description: Real-time internal team chat (DMs, groups, channels) at /chat, tenant-scoped, Phase 1 built
type: feature
---
Slack-style internal chat for the brokerage team.

- Route `/chat`, sidebar entry with unread badge (`useUnreadChatCount`).
- Tables: `conversations` (direct/group/channel/deal, `organisation_id` = tenants.id, optional `deal_id` = leads.id), `conversation_members` (role, last_read_at, mute/favourite/hidden), `messages` (soft delete, edits, `parent_message_id` for future threads), `message_reactions`, `message_attachments`, `pinned_messages`, `meetings` (placeholder for Phase 2).
- Storage: private `chat-attachments` bucket, 25 MB, path `<conversation_id>/<file>`; only conversation members can read/write.
- RLS: members-only, plus same-tenant visibility for public channels; post only as self, edit/delete own messages, conversation admins can moderate.
- Realtime enabled on messages/members via Supabase Realtime publication.
- Phase 2 (not built): threads, reactions UI, mentions, presence/typing, search, deal-linked chats, notifications/email digests, meetings, external participants.

## Deal Chat
- Every deal has one permanent internal chat: `conversations` row with `type='deal'` + `deal_id` (unique partial index), lazily created by `get_or_create_deal_conversation(lead_id)`.
- Access is deal-authoritative: `can_view_conversation` allows deal chats when `can_manage_lead(deal_id)` is true (owning broker, their staff, super admin).
- Members auto-added on open: broker, assigned user, caller, same-broker staff.
- Lifecycle system messages (`message_type='system'`) posted by trigger on leads: status/WIP stage change, lodged, approved, settled.
- UI: Chat tab in the deal file (`DealChatPanel`), and a "Deal chats" section in `/chat` with an "Open deal" link to `/admin?lead=<id>`.
