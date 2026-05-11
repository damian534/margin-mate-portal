
-- =========================================================================
-- Comprehensive deal audit trail: triggers write to public.notes
-- =========================================================================

-- Helper: short label for a UUID user
CREATE OR REPLACE FUNCTION public._audit_actor()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() $$;

-- ------------- LEADS: field-level audit -------------
CREATE OR REPLACE FUNCTION public.audit_lead_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  msgs text[] := ARRAY[]::text[];
  m text;
  fmt_money text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notes (lead_id, content, author_id)
    VALUES (NEW.id, '⚙️ Deal created', _audit_actor());
    RETURN NEW;
  END IF;

  -- Opportunity / client identity
  IF NEW.opportunity_name IS DISTINCT FROM OLD.opportunity_name THEN
    msgs := msgs || ('⚙️ Opportunity name: ' || COALESCE(OLD.opportunity_name,'—') || ' → ' || COALESCE(NEW.opportunity_name,'—'));
  END IF;
  IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    msgs := msgs || ('👤 Client name: ' || COALESCE(OLD.first_name,'')||' '||COALESCE(OLD.last_name,'') || ' → ' || COALESCE(NEW.first_name,'')||' '||COALESCE(NEW.last_name,''));
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    msgs := msgs || ('👤 Email: ' || COALESCE(OLD.email,'—') || ' → ' || COALESCE(NEW.email,'—'));
  END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    msgs := msgs || ('👤 Phone: ' || COALESCE(OLD.phone,'—') || ' → ' || COALESCE(NEW.phone,'—'));
  END IF;

  -- Loan
  IF NEW.loan_amount IS DISTINCT FROM OLD.loan_amount THEN
    msgs := msgs || ('💰 Loan amount: $' || COALESCE(OLD.loan_amount::text,'0') || ' → $' || COALESCE(NEW.loan_amount::text,'0'));
  END IF;

  -- WIP / lifecycle dates
  IF NEW.wip_status IS DISTINCT FROM OLD.wip_status THEN
    msgs := msgs || ('🔄 WIP stage: ' || COALESCE(OLD.wip_status,'—') || ' → ' || COALESCE(NEW.wip_status,'—'));
  END IF;
  IF NEW.lodged_date IS DISTINCT FROM OLD.lodged_date THEN
    msgs := msgs || ('🔄 Lodged date: ' || COALESCE(OLD.lodged_date::text,'—') || ' → ' || COALESCE(NEW.lodged_date::text,'—'));
  END IF;
  IF NEW.approved_date IS DISTINCT FROM OLD.approved_date THEN
    msgs := msgs || ('🔄 Approved date: ' || COALESCE(OLD.approved_date::text,'—') || ' → ' || COALESCE(NEW.approved_date::text,'—'));
  END IF;
  IF NEW.settled_date IS DISTINCT FROM OLD.settled_date THEN
    msgs := msgs || ('🔄 Settled date: ' || COALESCE(OLD.settled_date::text,'—') || ' → ' || COALESCE(NEW.settled_date::text,'—'));
  END IF;
  IF NEW.estimated_settlement_date IS DISTINCT FROM OLD.estimated_settlement_date THEN
    msgs := msgs || ('🔄 Est. settlement: ' || COALESCE(OLD.estimated_settlement_date::text,'—') || ' → ' || COALESCE(NEW.estimated_settlement_date::text,'—'));
  END IF;

  -- Pre-approval headline numbers
  IF NEW.pre_approval_purchase_price IS DISTINCT FROM OLD.pre_approval_purchase_price THEN
    msgs := msgs || ('📋 Pre-approval purchase price: $' || COALESCE(OLD.pre_approval_purchase_price::text,'0') || ' → $' || COALESCE(NEW.pre_approval_purchase_price::text,'0'));
  END IF;
  IF NEW.pre_approval_loan_amount IS DISTINCT FROM OLD.pre_approval_loan_amount THEN
    msgs := msgs || ('📋 Pre-approval loan: $' || COALESCE(OLD.pre_approval_loan_amount::text,'0') || ' → $' || COALESCE(NEW.pre_approval_loan_amount::text,'0'));
  END IF;
  IF NEW.pre_approval_expiry_date IS DISTINCT FROM OLD.pre_approval_expiry_date THEN
    msgs := msgs || ('📋 Pre-approval expiry: ' || COALESCE(OLD.pre_approval_expiry_date::text,'—') || ' → ' || COALESCE(NEW.pre_approval_expiry_date::text,'—'));
  END IF;

  -- Referrer / source
  IF NEW.referral_partner_id IS DISTINCT FROM OLD.referral_partner_id THEN
    msgs := msgs || ('👤 Referral partner reassigned');
  END IF;
  IF NEW.source IS DISTINCT FROM OLD.source THEN
    msgs := msgs || ('⚙️ Lead source: ' || COALESCE(OLD.source,'—') || ' → ' || COALESCE(NEW.source,'—'));
  END IF;

  -- Broker assignment
  IF NEW.broker_id IS DISTINCT FROM OLD.broker_id THEN
    msgs := msgs || ('🔄 Broker reassigned');
  END IF;

  -- Commission
  IF NEW.referrer_commission IS DISTINCT FROM OLD.referrer_commission OR NEW.referrer_commission_type IS DISTINCT FROM OLD.referrer_commission_type THEN
    msgs := msgs || ('💰 Referrer commission updated');
  END IF;
  IF NEW.referrer_commission_paid IS DISTINCT FROM OLD.referrer_commission_paid THEN
    msgs := msgs || ('💰 Referrer commission marked ' || CASE WHEN NEW.referrer_commission_paid THEN 'PAID' ELSE 'unpaid' END);
  END IF;
  IF NEW.company_commission IS DISTINCT FROM OLD.company_commission OR NEW.company_commission_type IS DISTINCT FROM OLD.company_commission_type THEN
    msgs := msgs || ('💰 Company commission updated');
  END IF;
  IF NEW.company_commission_paid IS DISTINCT FROM OLD.company_commission_paid THEN
    msgs := msgs || ('💰 Company commission marked ' || CASE WHEN NEW.company_commission_paid THEN 'PAID' ELSE 'unpaid' END);
  END IF;

  -- Insert each message
  FOREACH m IN ARRAY msgs LOOP
    INSERT INTO public.notes (lead_id, content, author_id) VALUES (NEW.id, m, _audit_actor());
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_lead_changes ON public.leads;
CREATE TRIGGER trg_audit_lead_changes
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.audit_lead_changes();

-- ------------- LOAN SPLITS -------------
CREATE OR REPLACE FUNCTION public.audit_loan_splits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead uuid; _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _lead := NEW.lead_id;
    _msg := '💰 Loan split added' || COALESCE(' · $' || NEW.amount::text, '') || COALESCE(' · ' || NEW.lender, '');
  ELSIF TG_OP = 'DELETE' THEN
    _lead := OLD.lead_id;
    _msg := '💰 Loan split removed' || COALESCE(' · $' || OLD.amount::text, '');
  ELSE
    _lead := NEW.lead_id;
    IF NEW.settled IS DISTINCT FROM OLD.settled THEN
      _msg := '💰 Split ' || CASE WHEN NEW.settled THEN 'marked SETTLED' ELSE 'reopened' END || COALESCE(' · $' || NEW.amount::text, '');
    ELSIF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.lender IS DISTINCT FROM OLD.lender OR NEW.security_address IS DISTINCT FROM OLD.security_address OR NEW.application_id IS DISTINCT FROM OLD.application_id OR NEW.loan_purpose IS DISTINCT FROM OLD.loan_purpose THEN
      _msg := '💰 Loan split updated' || COALESCE(' · $' || NEW.amount::text, '') || COALESCE(' · ' || NEW.lender, '');
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  INSERT INTO public.notes (lead_id, content, author_id) VALUES (_lead, _msg, _audit_actor());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_loan_splits ON public.loan_splits;
CREATE TRIGGER trg_audit_loan_splits
AFTER INSERT OR UPDATE OR DELETE ON public.loan_splits
FOR EACH ROW EXECUTE FUNCTION public.audit_loan_splits();

-- ------------- APPLICANTS -------------
CREATE OR REPLACE FUNCTION public.audit_lead_applicants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead uuid; _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _lead := NEW.lead_id; _msg := '👤 Applicant added: ' || COALESCE(NEW.name,'(unnamed)');
  ELSIF TG_OP = 'DELETE' THEN
    _lead := OLD.lead_id; _msg := '👤 Applicant removed: ' || COALESCE(OLD.name,'(unnamed)');
  ELSE
    _lead := NEW.lead_id;
    IF NEW.name IS DISTINCT FROM OLD.name OR NEW.email IS DISTINCT FROM OLD.email OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.employment_type IS DISTINCT FROM OLD.employment_type THEN
      _msg := '👤 Applicant updated: ' || COALESCE(NEW.name,'(unnamed)');
    ELSE RETURN NEW; END IF;
  END IF;
  INSERT INTO public.notes (lead_id, content, author_id) VALUES (_lead, _msg, _audit_actor());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_lead_applicants ON public.lead_applicants;
CREATE TRIGGER trg_audit_lead_applicants
AFTER INSERT OR UPDATE OR DELETE ON public.lead_applicants
FOR EACH ROW EXECUTE FUNCTION public.audit_lead_applicants();

-- ------------- TASKS -------------
CREATE OR REPLACE FUNCTION public.audit_tasks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead uuid; _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _lead := NEW.lead_id;
    IF _lead IS NULL THEN RETURN NEW; END IF;
    _msg := '📋 Task created: ' || COALESCE(NEW.title,'(untitled)');
  ELSIF TG_OP = 'DELETE' THEN
    _lead := OLD.lead_id;
    IF _lead IS NULL THEN RETURN OLD; END IF;
    _msg := '📋 Task deleted: ' || COALESCE(OLD.title,'(untitled)');
  ELSE
    _lead := NEW.lead_id;
    IF _lead IS NULL THEN RETURN NEW; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      _msg := '📋 Task "' || COALESCE(NEW.title,'(untitled)') || '" → ' || NEW.status;
    ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      _msg := '📋 Task "' || COALESCE(NEW.title,'(untitled)') || '" reassigned';
    ELSIF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      _msg := '📋 Task "' || COALESCE(NEW.title,'(untitled)') || '" due ' || COALESCE(NEW.due_date::text,'cleared');
    ELSE RETURN NEW; END IF;
  END IF;
  INSERT INTO public.notes (lead_id, content, author_id) VALUES (_lead, _msg, _audit_actor());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_tasks ON public.tasks;
CREATE TRIGGER trg_audit_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.audit_tasks();

-- ------------- CALENDAR EVENTS -------------
CREATE OR REPLACE FUNCTION public.audit_lead_calendar_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead uuid; _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _lead := NEW.lead_id;
    _msg := '🔄 Calendar event scheduled: "' || COALESCE(NEW.title,'(untitled)') || '" on ' || to_char(NEW.start_time, 'DD Mon YYYY HH24:MI');
  ELSIF TG_OP = 'DELETE' THEN
    _lead := OLD.lead_id;
    _msg := '🔄 Calendar event removed: "' || COALESCE(OLD.title,'(untitled)') || '"';
  ELSE
    _lead := NEW.lead_id;
    IF NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.title IS DISTINCT FROM OLD.title THEN
      _msg := '🔄 Calendar event updated: "' || COALESCE(NEW.title,'(untitled)') || '"';
    ELSE RETURN NEW; END IF;
  END IF;
  INSERT INTO public.notes (lead_id, content, author_id) VALUES (_lead, _msg, _audit_actor());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_lead_calendar_events ON public.lead_calendar_events;
CREATE TRIGGER trg_audit_lead_calendar_events
AFTER INSERT OR UPDATE OR DELETE ON public.lead_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.audit_lead_calendar_events();

-- ------------- FINANCE EXTENSIONS -------------
CREATE OR REPLACE FUNCTION public.audit_finance_extensions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notes (lead_id, content, author_id)
  VALUES (NEW.lead_id,
    '💰 Finance extension requested · ' || NEW.requested_days || ' days → ' || COALESCE(NEW.proposed_new_date::text,'TBD') || ' · sent to ' || COALESCE(NEW.recipient_name, NEW.recipient_email),
    _audit_actor());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_finance_extensions ON public.lead_finance_extensions;
CREATE TRIGGER trg_audit_finance_extensions
AFTER INSERT ON public.lead_finance_extensions
FOR EACH ROW EXECUTE FUNCTION public.audit_finance_extensions();

-- ------------- MIR REQUESTS -------------
CREATE OR REPLACE FUNCTION public.audit_mir_requests()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notes (lead_id, content, author_id)
  VALUES (NEW.lead_id,
    '📨 MIR sent to ' || array_to_string(NEW.recipient_emails, ', ') || ' · ' || NEW.document_count || ' document(s)' || COALESCE(' · ' || NEW.lender, ''),
    _audit_actor());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_mir_requests ON public.mir_requests;
CREATE TRIGGER trg_audit_mir_requests
AFTER INSERT ON public.mir_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_mir_requests();

-- ------------- LEAD REFERRALS (between brokers) -------------
CREATE OR REPLACE FUNCTION public.audit_lead_referrals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _msg := '🔄 Lead referred to another broker (pending acceptance)';
    INSERT INTO public.notes (lead_id, content, author_id) VALUES (NEW.lead_id, _msg, _audit_actor());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    _msg := '🔄 Broker referral ' || NEW.status;
    INSERT INTO public.notes (lead_id, content, author_id) VALUES (NEW.lead_id, _msg, _audit_actor());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_lead_referrals ON public.lead_referrals;
CREATE TRIGGER trg_audit_lead_referrals
AFTER INSERT OR UPDATE ON public.lead_referrals
FOR EACH ROW EXECUTE FUNCTION public.audit_lead_referrals();
