-- My Performance — Neon Postgres schema for GitHub Pages + Neon Auth
--
-- Architecture:
-- GitHub Pages -> @neondatabase/neon-js -> Neon Auth -> Neon Data API -> Postgres
--
-- Neon Auth and Data API must be provisioned for the same branch/database.
-- The application never receives a Postgres connection string or database password.

CREATE TABLE IF NOT EXISTS public.my_performance_state (
  user_id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.my_performance_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS my_performance_own_state ON public.my_performance_state;
CREATE POLICY my_performance_own_state
ON public.my_performance_state
FOR ALL
TO authenticated
USING (auth.user_id() = user_id)
WITH CHECK (auth.user_id() = user_id);

REVOKE ALL ON public.my_performance_state FROM PUBLIC;
REVOKE ALL ON public.my_performance_state FROM anonymous;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.my_performance_state TO authenticated;

CREATE OR REPLACE FUNCTION public.my_performance_pull()
RETURNS TABLE(found boolean, state jsonb, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid text;
  v_payload jsonb;
  v_updated timestamptz;
BEGIN
  v_uid := auth.user_id();
  IF v_uid IS NULL OR v_uid = '' THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT s.payload, s.updated_at
    INTO v_payload, v_updated
  FROM public.my_performance_state s
  WHERE s.user_id = v_uid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::jsonb, NULL::timestamptz;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_payload, v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_performance_push(p_state jsonb)
RETURNS TABLE(ok boolean, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid text;
  v_updated timestamptz;
BEGIN
  v_uid := auth.user_id();
  IF v_uid IS NULL OR v_uid = '' THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.my_performance_state(user_id, payload, updated_at)
  VALUES(v_uid, COALESCE(p_state, '{}'::jsonb), now())
  ON CONFLICT(user_id)
  DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
  RETURNING my_performance_state.updated_at INTO v_updated;

  RETURN QUERY SELECT true, v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.my_performance_pull() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_performance_push(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_performance_pull() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_performance_push(jsonb) TO authenticated;

-- Optional verification queries:
-- SELECT policyname, roles FROM pg_policies WHERE tablename='my_performance_state';
-- SELECT proname FROM pg_proc WHERE proname IN ('my_performance_pull','my_performance_push');
