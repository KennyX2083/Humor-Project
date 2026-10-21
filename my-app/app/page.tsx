import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import SignOutButton from "./components/google-sign-out-button";
import GoogleSignInButton from "./components/google-sign-in-button";
import ExcuseVoteButtons from "./components/excuse-vote-buttons";
import GameFilter from "./components/game-filter";

export const dynamic = "force-dynamic";

type ExcuseFeedItem = {
  id: string;
  game: string;
  character_name: string | null;
  situation: string | null;
  excuse: string;
  created_at: string;
  valid_count: number;
  skill_issue_count: number;
  total_count: number;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    game?: string;
    sort?: string;
    page?: string;
    scope?: string;
  }>;
}) {
  const { game, sort, page, scope } = await searchParams;

  const selectedGame =
    game === "valorant" || game === "league" || game === "overwatch"
      ? game
      : "all";
  const selectedSort = sort === "valid" || sort === "skill" ? sort : "newest";

  const parsedPage = Number(page ?? "1");

  const currentPage =
    Number.isSafeInteger(parsedPage) &&
    parsedPage > 0 &&
    parsedPage <= 2147483647
      ? parsedPage
      : 1;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const selectedScope = user && scope === "mine" ? "mine" : "all";

  if (user) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return (
        <main className="site-shell">
          <p className="empty-state">
            Could not load your profile. Please refresh and try again.
          </p>
        </main>
      );
    }

    if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
      redirect("/profile");
    }
  }

  const { data: feedData, error: feedError } = await supabase.rpc(
    "get_scoped_excuse_feed",
    {
      p_game: selectedGame,
      p_sort: selectedSort,
      p_page: currentPage,
      p_scope: selectedScope,
    }
  );

  const invalidFeed = feedData !== null && !Array.isArray(feedData);

  const error =
    feedError || (invalidFeed ? new Error("Unexpected feed response.") : null);

  const excuses: ExcuseFeedItem[] =
    !error && Array.isArray(feedData) ? (feedData as ExcuseFeedItem[]) : [];
  if (!error && excuses.length === 0 && currentPage > 1) {
    redirect(pageHref(1));
  }

  const totalCount = Number(excuses?.[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / 12));

  type VoteCounts = {
    valid: number;
    skillIssue: number;
  };

  const countsByExcuse = new Map<string, VoteCounts>();
  const countsFailed = Boolean(error);

  for (const item of excuses ?? []) {
    countsByExcuse.set(item.id, {
      valid: Number(item.valid_count),
      skillIssue: Number(item.skill_issue_count),
    });
  }
  // Load the signed-in user's votes for the displayed excuses.
  const votesByExcuse = new Map<string, number>();
  let votesFailed = false;

  if (user && excuses?.length) {
    const { data: votes, error: votesError } = await supabase
      .from("excuse_votes")
      .select("excuse_id, vote")
      .eq("user_id", user.id)
      .in(
        "excuse_id",
        excuses.map((item) => item.id),
      );

    votesFailed = Boolean(votesError);

    for (const vote of votes ?? []) {
      votesByExcuse.set(vote.excuse_id, vote.vote);
    }
  }

  function pageHref(pageNumber: number) {
    const params = new URLSearchParams();

    if (selectedGame !== "all") params.set("game", selectedGame);
    if (selectedSort !== "newest") params.set("sort", selectedSort);
    if (selectedScope === "mine") params.set("scope", "mine");
    if (pageNumber > 1) params.set("page", String(pageNumber));

    const query = params.toString();
    return query ? `/?${query}` : "/";
  }

  const feedVersion = crypto.randomUUID();
  return (
    <div className="site-shell queue-page">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            e.
          </span>
          Excuse Queue
        </Link>

        <nav className="header-actions" aria-label="Main navigation">
          <Link href="/" aria-current="page">
            Vote
          </Link>
          <Link href="/create">Create</Link>

          {user ? (
            <>
              <Link href="/profile">My Profile</Link>
              <SignOutButton />
            </>
          ) : (
            <GoogleSignInButton />
          )}
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">The post-match damage control department</p>
          <h1 id="hero-title">
            Bad game. <span>Good excuse.</span>
          </h1>
          <p className="hero-description">
            Read the incidents. Judge the excuses. Vote for the best defense.
          </p>
        </section>

        <section aria-labelledby="feed-heading">
          <div className="collection-heading">
            <h2 id="feed-heading">The review queue</h2>
          </div>

          <GameFilter 
            selectedGame={selectedGame} 
            selectedSort={selectedSort} 
            selectedScope={selectedScope} 
            canViewMine={Boolean(user)}
          />

          {error ? (
            <p className="empty-state" role="alert">
              Could not load excuses. Please refresh and try again.
            </p>
          ) : !excuses?.length ? (
            <p className="empty-state">
              No excuses yet. Be the first to plead your case.
            </p>
          ) : (
            <ul className="joke-grid">
              {excuses.map((item) => (
                <li key={item.id}>
                  <article className="joke-card" data-game={item.game}>
                    <span className="joke-number">
                      {item.game === "valorant"
                        ? "Valorant"
                        : item.game === "league"
                          ? "League of Legends"
                          : item.game === "overwatch"
                            ? "Overwatch"
                            : "Unknown Game"}
                      {item.character_name && ` · ${item.character_name}`}
                    </span>

                    {item.situation && (
                      <div className="incident-report">
                        <p className="report-label">Incident report</p>
                        <p>{item.situation}</p>
                      </div>
                    )}

                    <p className="report-label">Their defense</p>
                    <h3>{item.excuse}</h3>

                    {countsFailed && (
                      <p className="profile-muted" role="status">
                        Vote counts are unavailable. Refresh to try again.
                      </p>
                    )}

                    {/* Voting controls belong inside each excuse card. */}
                    {user ? (
                      votesFailed ? (
                        <p role="alert">
                          Could not load your vote. Refresh to try again.
                        </p>
                      ) : (
                        <ExcuseVoteButtons
                          key={`${item.id}-${feedVersion}`}
                          excuseId={item.id}
                          initialVote={votesByExcuse.get(item.id) ?? null}
                          validCount={
                            countsFailed
                              ? null
                              : (countsByExcuse.get(item.id)?.valid ?? 0)
                          }
                          skillIssueCount={
                            countsFailed
                              ? null
                              : (countsByExcuse.get(item.id)?.skillIssue ?? 0)
                          }
                        />
                      )
                    ) : (
                      <div className="vote-controls">
                        {!countsFailed && (
                          <p className="profile-muted">
                            Valid excuse ·{" "}
                            {countsByExcuse.get(item.id)?.valid ?? 0}
                            {" / "}
                            Skill issue ·{" "}
                            {countsByExcuse.get(item.id)?.skillIssue ?? 0}
                          </p>
                        )}

                        <p className="profile-muted">
                          Sign in to vote on this excuse.
                        </p>
                      </div>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
          {!error && excuses.length > 0 && (
            <nav className="pagination" aria-label="Excuse pages">
              {currentPage > 1 ? (
                <Link href={pageHref(currentPage - 1)}>← Previous</Link>
              ) : (
                <span aria-disabled="true">← Previous</span>
              )}

              <span>
                Page {currentPage} of {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link href={pageHref(currentPage + 1)}>Next →</Link>
              ) : (
                <span aria-disabled="true">Next →</span>
              )}
            </nav>
          )}
        </section>
      </main>

      <footer className="site-footer">
        Excuse Queue · Your rank deserves a better explanation.
      </footer>
    </div>
  );
}
