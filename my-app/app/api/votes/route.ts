import { createClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Sign in to vote." }, { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.excuseId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.excuseId,
    ) ||
    (body.vote !== 1 && body.vote !== -1)
  ) {
    return Response.json({ error: "Invalid vote." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("excuse_votes").insert({
    excuse_id: body.excuseId,
    user_id: user.id,
    vote: body.vote,
  });

  if (insertError?.code === "23505") {
    // The user already voted. Update only the vote column.
    const { data, error } = await supabase
      .from("excuse_votes")
      .update({ vote: body.vote })
      .eq("excuse_id", body.excuseId)
      .eq("user_id", user.id)
      .select("vote")
      .single();

    if (error || !data) {
      return Response.json(
        { error: "Could not change your vote. Please try again." },
        { status: 500 },
      );
    }
  } else if (insertError) {
    return Response.json(
      { error: "Could not save your vote. Refresh and try again." },
      { status: 500 },
    );
  }

  const { data: counts, error: countsError } = await supabase.rpc(
    "get_excuse_vote_counts",
    { excuse_ids: [body.excuseId] },
  );

  const row = Array.isArray(counts) ? counts[0] : undefined;
  const validCount = Number(row?.valid_count);
  const skillIssueCount = Number(row?.skill_issue_count);

  if (
    countsError ||
    !row ||
    !Number.isSafeInteger(validCount) ||
    !Number.isSafeInteger(skillIssueCount) ||
    validCount < 0 ||
    skillIssueCount < 0
  ) {
    return Response.json({
      vote: body.vote,
      validCount: null,
      skillIssueCount: null,
      warning: "Vote saved, but counts are unavailable. Refresh to try again.",
    });
  }

  return Response.json({
    vote: body.vote,
    validCount,
    skillIssueCount,
  });
}
