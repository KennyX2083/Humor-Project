-- Humor Project: Overwatch support, vote counts, and paginated feed.
-- Captured from the current Supabase database.
--
-- Prerequisites: public.excuses and public.excuse_votes already exist,
-- with their original keys, grants, and row-level security policies.
-- This file records feature changes; it is not a complete database backup.
-- Run with the Supabase SQL Editor's postgres role when recreating the setup.
-- These SECURITY DEFINER functions intentionally expose public excuse content
-- and aggregate counts only. They must be revisited if excuses become private.
-- Saving this file does not run any SQL. No existing excuse rows are deleted.

BEGIN;

ALTER TABLE public.excuses
  DROP CONSTRAINT IF EXISTS excuses_game_check;

ALTER TABLE public.excuses
  ADD CONSTRAINT excuses_game_check
  CHECK ((game = ANY (ARRAY['valorant'::text, 'league'::text, 'overwatch'::text])));

CREATE OR REPLACE FUNCTION public.get_excuse_feed(p_game text DEFAULT 'all'::text, p_sort text DEFAULT 'newest'::text, p_page integer DEFAULT 1)
 RETURNS TABLE(id uuid, game text, character_name text, situation text, excuse text, created_at timestamp with time zone, valid_count bigint, skill_issue_count bigint, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH counted AS (
    SELECT
      e.id,
      e.game,
      e.character_name,
      e.situation,
      e.excuse,
      e.created_at,
      count(v.excuse_id) FILTER (
        WHERE v.vote = 1
      ) AS valid_count,
      count(v.excuse_id) FILTER (
        WHERE v.vote = -1
      ) AS skill_issue_count
    FROM public.excuses AS e
    LEFT JOIN public.excuse_votes AS v
      ON v.excuse_id = e.id
    WHERE p_game = 'all' OR e.game = p_game
    GROUP BY e.id
  )
  SELECT
    c.*,
    count(*) OVER () AS total_count
  FROM counted AS c
  ORDER BY
    CASE WHEN p_sort = 'valid'
      THEN c.valid_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'skill'
      THEN c.skill_issue_count END DESC NULLS LAST,
    c.created_at DESC,
    c.id DESC
  LIMIT 12
  OFFSET (greatest(coalesce(p_page, 1), 1)::bigint - 1) * 12;
$function$;

CREATE OR REPLACE FUNCTION public.get_excuse_vote_counts(excuse_ids uuid[])
 RETURNS TABLE(excuse_id uuid, valid_count bigint, skill_issue_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    e.id AS excuse_id,
    count(v.excuse_id) FILTER (WHERE v.vote = 1) AS valid_count,
    count(v.excuse_id) FILTER (WHERE v.vote = -1) AS skill_issue_count
  FROM public.excuses AS e
  LEFT JOIN public.excuse_votes AS v
    ON v.excuse_id = e.id
  WHERE e.id = ANY(excuse_ids)
  GROUP BY e.id;
$function$;

-- Preserve the current function ownership and explicit execution permissions.
ALTER FUNCTION public.get_excuse_feed(text, text, integer) OWNER TO postgres;
ALTER FUNCTION public.get_excuse_vote_counts(uuid[]) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_excuse_feed(text, text, integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_excuse_vote_counts(uuid[])
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_excuse_feed(text, text, integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_excuse_vote_counts(uuid[])
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_scoped_excuse_feed(
  p_game text DEFAULT 'all',
  p_sort text DEFAULT 'newest',
  p_page integer DEFAULT 1,
  p_scope text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  game text,
  character_name text,
  situation text,
  excuse text,
  created_at timestamptz,
  valid_count bigint,
  skill_issue_count bigint,
  total_count bigint
)
LANGUAGE sql

SECURITY DEFINER
SET search_path = ''
AS $$
  WITH counted AS (
    SELECT
      e.id,
      e.game,
      e.character_name,
      e.situation,
      e.excuse,
      e.created_at,
      count(v.excuse_id) FILTER (
        WHERE v.vote = 1
      ) AS valid_count,
      count(v.excuse_id) FILTER (
        WHERE v.vote = -1
      ) AS skill_issue_count
    FROM public.excuses AS e
    LEFT JOIN public.excuse_votes AS v
      ON v.excuse_id = e.id
    WHERE
      (p_game = 'all' OR e.game = p_game)
      AND (
        p_scope = 'all'
        OR (
          p_scope = 'mine'
          AND (SELECT auth.uid()) IS NOT NULL
          AND e.user_id = (SELECT auth.uid())
        )
      )
    GROUP BY e.id
  )
  SELECT
    c.*,
    count(*) OVER () AS total_count
  FROM counted AS c
  ORDER BY
    CASE WHEN p_sort = 'valid'
      THEN c.valid_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'skill'
      THEN c.skill_issue_count END DESC NULLS LAST,
    c.created_at DESC,
    c.id DESC
  LIMIT 12
  OFFSET (greatest(coalesce(p_page, 1), 1)::bigint - 1) * 12;
$$;

REVOKE ALL
ON FUNCTION public.get_scoped_excuse_feed(text, text, integer, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_scoped_excuse_feed(text, text, integer, text)
TO anon, authenticated, service_role;

COMMIT;

-- Optional read-only checks (run separately):
-- SELECT * FROM public.get_excuse_feed('all', 'valid', 1);
-- SELECT * FROM public.get_excuse_feed('overwatch', 'skill', 1);
-- SELECT * FROM public.get_excuse_vote_counts(
--   ARRAY(SELECT id FROM public.excuses LIMIT 5)
-- );
