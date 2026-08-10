-- My Performance — Neon Postgres setup for GitHub Pages
-- 1) Replace CHANGE_THIS_SYNC_KEY with a long private passphrase.
-- 2) Run this entire file in Neon SQL Editor.
-- 3) Enable Neon Data API for this database, allowing unauthenticated access.
--    Direct table access remains revoked; the browser can only call the two RPCs below.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.my_performance_state (
  profile_id text PRIMARY KEY,
  sync_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.my_performance_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.my_performance_state FROM PUBLIC;

INSERT INTO public.my_performance_state(profile_id, sync_hash, payload)
VALUES ('vitor', crypt('CHANGE_THIS_SYNC_KEY', gen_salt('bf')), '{}'::jsonb)
ON CONFLICT (profile_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.my_performance_pull(p_profile text, p_key text)
RETURNS TABLE(found boolean, state jsonb, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash text;
  v_payload jsonb;
  v_updated timestamptz;
BEGIN
  SELECT s.sync_hash, s.payload, s.updated_at
    INTO v_hash, v_payload, v_updated
  FROM public.my_performance_state s
  WHERE s.profile_id = p_profile;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::jsonb, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_hash IS NULL OR crypt(p_key, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'invalid sync key' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY SELECT true, v_payload, v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_performance_push(p_profile text, p_key text, p_state jsonb)
RETURNS TABLE(ok boolean, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash text;
  v_updated timestamptz;
BEGIN
  SELECT s.sync_hash INTO v_hash
  FROM public.my_performance_state s
  WHERE s.profile_id = p_profile;

  IF NOT FOUND OR v_hash IS NULL OR crypt(p_key, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'invalid sync key' USING ERRCODE = '28000';
  END IF;

  UPDATE public.my_performance_state
  SET payload = p_state, updated_at = now()
  WHERE profile_id = p_profile
  RETURNING my_performance_state.updated_at INTO v_updated;

  RETURN QUERY SELECT true, v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.my_performance_pull(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_performance_push(text,text,jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anonymous') THEN
    GRANT USAGE ON SCHEMA public TO anonymous;
    GRANT EXECUTE ON FUNCTION public.my_performance_pull(text,text) TO anonymous;
    GRANT EXECUTE ON FUNCTION public.my_performance_push(text,text,jsonb) TO anonymous;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT EXECUTE ON FUNCTION public.my_performance_pull(text,text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.my_performance_push(text,text,jsonb) TO authenticated;
  END IF;
END $$;

-- To rotate the sync key later:
-- UPDATE public.my_performance_state
-- SET sync_hash = crypt('NEW_PRIVATE_KEY', gen_salt('bf'))
-- WHERE profile_id = 'vitor';
