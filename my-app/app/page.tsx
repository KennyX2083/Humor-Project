import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import SignOutButton from "./components/google-sign-out-button";
import GoogleSignInButton from "./components/google-sign-in-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
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

  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline")
    .order("id");

  if (error) {
    console.error("Could not load jokes:", error.message);

    return (
      <main className="site-shell">
        <p className="empty-state">
          Could not load jokes. Please try again.
        </p>
      </main>
    );
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            h.
          </span>
          Humor Project
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
          <p className="eyebrow">A little less tilt. A little more laughter.</p>

          <h1 id="hero-title">
            Good games.
            <br />
            <span>Questionable jokes.</span>
          </h1>

          <p className="hero-description">
            Take a break from ranked. Your next loss can wait—
            these punchlines can’t.
          </p>
        </section>

        <section aria-labelledby="jokes-heading">
          <div className="collection-heading">
            <h2 id="jokes-heading">The joke collection</h2>
            <span>
              {jokes.length} {jokes.length === 1 ? "joke" : "jokes"}
            </span>
          </div>

          {jokes.length === 0 ? (
            <p className="empty-state">
              No jokes yet. The lobby is unusually quiet.
            </p>
          ) : (
            <ul className="joke-grid">
              {jokes.map((joke, index) => (
                <li key={joke.id}>
                  <article className="joke-card">
                    <span className="joke-number">
                      / {String(index + 1).padStart(2, "0")}
                    </span>

                    <h3>{joke.setup}</h3>
                    <p className="punchline">{joke.punchline}</p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="site-footer">
        Humor Project · Built for the between-game break.
      </footer>
    </div>
  );
}