ALTER TABLE public.esign_fields DROP CONSTRAINT esign_fields_type_check;
ALTER TABLE public.esign_fields ADD CONSTRAINT esign_fields_type_check
  CHECK (field_type IN ('signature','initials','full_name','date','text','checkbox'));