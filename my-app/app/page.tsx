import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import SignOutButton from "./components/google-sign-out-button";
import GoogleSignInButton from "./components/google-sign-in-button";
import ExcuseGenerator from "./components/excuse-generator";
import ExcuseVoteButtons from "./components/excuse-vote-buttons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: excuses, error } = await supabase
    .from("excuses")
    .select("id, game, character_name, situation, excuse, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Load the signed-in user's votes for the displayed excuses.
  const votesByExcuse = new Map<string, number>();
  let votesFailed = false;

  if (user && excuses?.length) {
    const { data: votes, error: votesError } = await supabase
      .from("excuse_votes")
      .select("excuse_id, vote")
      .eq("user_id", user.id)
      .in("excuse_id", excuses.map((item) => item.id));

    votesFailed = Boolean(votesError);

    for (const vote of votes ?? []) {
      votesByExcuse.set(vote.excuse_id, vote.vote);
    }
  }

  return (
    <div className="site-shell queue-page">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            e.
          </span>
          Excuse Queue
        </Link>

        <nav className="header-actions" aria-label="Account">
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
            Tell us what happened. Give the lobby your side of the story.
          </p>
        </section>

        {user ? (
          <ExcuseGenerator />
        ) : (
          <p className="empty-state">
            Sign in with Google above to generate excuses and vote. Everyone can
            browse.
          </p>
        )}

        <section aria-labelledby="feed-heading">
          <div className="collection-heading">
            <h2 id="feed-heading">The review queue</h2>
            <span>Read the incident. Judge the defense.</span>
          </div>

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
                      {item.game === "valorant" ? "Valorant"
                        : item.game === "league" ? "League of Legends"
                        : item.game === "overwatch" ? "Overwatch"
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
                    <p className="ai-label">AI-generated</p>

                    {/* Voting controls belong inside each excuse card. */}
                    {user ? (
                      votesFailed ? (
                        <p role="alert">
                          Could not load your vote. Refresh to try again.
                        </p>
                      ) : (
                        <ExcuseVoteButtons
                          excuseId={item.id}
                          initialVote={votesByExcuse.get(item.id) ?? null}
                        />
                      )
                    ) : (
                      <p className="profile-muted">
                        Sign in to vote on this excuse.
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="site-footer">
        Excuse Queue · Your rank deserves a better explanation.
      </footer>
    </div>
  );
}