BEGIN;

CREATE TABLE public.excuse_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  game text NOT NULL
    CHECK (game IN ('valorant', 'league', 'overwatch')),

  character_name text
    CHECK (char_length(character_name) <= 100),

  situation text NOT NULL
    CHECK (char_length(situation) BETWEEN 5 AND 1000),

  prompt text NOT NULL
    CHECK (char_length(prompt) BETWEEN 1 AND 2000),

  excuse text NOT NULL
    CHECK (char_length(excuse) BETWEEN 1 AND 4000),

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.excuse_drafts
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.excuse_drafts
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.excuse_drafts
  TO authenticated;

CREATE POLICY "Users can read their own drafts"
ON public.excuse_drafts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own drafts"
ON public.excuse_drafts
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can discard their own drafts"
ON public.excuse_drafts
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.publish_excuse_draft(
  p_draft_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_draft public.excuse_drafts%ROWTYPE;
  v_published_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to publish.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.excuse_drafts
  WHERE id = p_draft_id
    AND user_id = v_user_id
  RETURNING * INTO v_draft;

  IF NOT FOUND THEN
    -- A previous publish may have succeeded before its response arrived.
    SELECT e.id INTO v_published_id
    FROM public.excuses AS e
    WHERE e.id = p_draft_id
      AND e.user_id = v_user_id;

    IF v_published_id IS NOT NULL THEN
      RETURN v_published_id;
    END IF;

    RAISE EXCEPTION 'Draft not found.'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.excuses (
    id,
    user_id,
    game,
    character_name,
    situation,
    prompt,
    excuse
  )
  VALUES (
    v_draft.id,
    v_user_id,
    v_draft.game,
    v_draft.character_name,
    v_draft.situation,
    v_draft.prompt,
    v_draft.excuse
  )
  RETURNING id INTO v_published_id;

  RETURN v_published_id;
END;
$$;

REVOKE ALL
ON FUNCTION public.publish_excuse_draft(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.publish_excuse_draft(uuid)
TO authenticated;

COMMIT;