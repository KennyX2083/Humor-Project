import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import ExcuseGenerator from "../components/excuse-generator";
import SignOutButton from "../components/google-sign-out-button";
import GoogleSignInButton from "../components/google-sign-in-button";
import Image from "next/image";

export const dynamic = "force-dynamic";
export default async function CreatePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
            <Link href="/">Vote</Link>
            <Link href="/create" aria-current="page">
              Create
            </Link>
            <GoogleSignInButton />
          </nav>
        </header>

        <main>
          <section className="hero">
            <p className="eyebrow">Your side of the story</p>
            <h1>
              Bad game. <span>Good excuse.</span>
            </h1>
            <p className="hero-description">
              Sign in with Google above to create an excuse or to vote. 
              You can browse without signing in by heading to the voting page.
            </p>
          </section>
        </main>

        <footer className="site-footer">
          Excuse Queue · Your rank deserves a better explanation.
        </footer>
      </div>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, photo_file_path")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <main className="site-shell">
        <p role="alert">
          Could not load your profile. Please refresh and try again.
        </p>
      </main>
    );
  }

  if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
    redirect("/profile");
  }

  let photoUrl: string | null = null;

  if (profile.photo_file_path) {
    const { data } = await supabase.storage
      .from("photos")
      .createSignedUrl(profile.photo_file_path, 3600);

    photoUrl = data?.signedUrl ?? null;
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

        <nav className="header-actions" aria-label="Main navigation">
          <Link href="/">Vote</Link>
          <Link href="/create" aria-current="page">
            Create
          </Link>
          <Link href="/profile">My Profile</Link>
          <SignOutButton />
        </nav>
      </header>

      <main>
        <section className="create-welcome">
          <Link href="/profile" aria-label="View your profile">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="create-avatar"
              />
            ) : (
              <span className="create-avatar create-avatar-fallback">
                {profile.first_name.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </Link>

          <div>
            <h1>Welcome, {profile.first_name}!</h1>
            <p>What do you need an excuse for?</p>
          </div>
        </section>

        <ExcuseGenerator />
      </main>

      <footer className="site-footer">
        Excuse Queue · Your rank deserves a better explanation.
      </footer>
    </div>
  );
}
