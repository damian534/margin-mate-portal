CREATE OR REPLACE FUNCTION public.audit_tasks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF NEW.completed IS DISTINCT FROM OLD.completed THEN
      _msg := '📋 Task "' || COALESCE(NEW.title,'(untitled)') || '" ' || CASE WHEN NEW.completed THEN 'completed ✅' ELSE 'reopened' END;
    ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      _msg := '📋 Task "' || COALESCE(NEW.title,'(untitled)') || '" reassigned';
    ELSIF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      _msg := '📋 Task "' || COALESCE(NEW.title,'(untitled)') || '" due ' || COALESCE(NEW.due_date::text,'cleared');
    ELSIF NEW.title IS DISTINCT FROM OLD.title THEN
      _msg := '📋 Task renamed: ' || COALESCE(OLD.title,'(untitled)') || ' → ' || COALESCE(NEW.title,'(untitled)');
    ELSE RETURN NEW; END IF;
  END IF;
  INSERT INTO public.notes (lead_id, content, author_id) VALUES (_lead, _msg, _audit_actor());
  RETURN COALESCE(NEW, OLD);
END $function$;