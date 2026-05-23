ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_notes_lead_pinned ON public.notes (lead_id, pinned);