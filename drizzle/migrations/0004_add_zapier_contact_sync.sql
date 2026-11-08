-- Per-brokerage Zapier webhook for outbound contact sync
alter table public.broker_email_settings
  add column if not exists zapier_webhook_url text;

-- Fire the contact-zapier-sync edge function whenever a contact is created.
create or replace function public.notify_contact_zapier_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://capydxuqpclcwadhwgvz.supabase.co/functions/v1/contact-zapier-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-key', 'czs-kX92mfQ7Lp4wZt8R'
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists trg_contact_zapier_sync on public.contacts;
create trigger trg_contact_zapier_sync
  after insert on public.contacts
  for each row execute function public.notify_contact_zapier_sync();