import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import Image from "next/image";
import ProfilePhotoUpload from "../components/profile-photo-upload";
import SignOutButton from "../components/google-sign-out-button";

async function saveProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (
    !firstName ||
    !lastName ||
    firstName.length > 100 ||
    lastName.length > 100
  ) {
    redirect("/profile?status=invalid");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq("id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("Profile save failed:", error?.message);
    redirect("/profile?status=error");
  }

  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile?status=saved");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}) {
  const { status, page } = await searchParams;

  const parsedPage = Number(page ?? "1");

  const currentPage =
    Number.isSafeInteger(parsedPage) &&
    parsedPage > 0 &&
    parsedPage <= 2147483647
      ? parsedPage
      : 1;

  const pageSize = 12;
  const start = (currentPage - 1) * pageSize;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, photo_file_path")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return <main>Could not load your profile. Please try again.</main>;
  }

  let photoUrl: string | null = null;
  let photoError = false;
  if (profile.photo_file_path) {
    const { data, error } = await supabase.storage
      .from("photos")
      .createSignedUrl(profile.photo_file_path, 3600);

    photoUrl = data?.signedUrl ?? null;
    photoError = Boolean(error);
  }

  const needsName = !profile.first_name?.trim() || !profile.last_name?.trim();

  const {
    data: myExcuses,
    error: myExcusesError,
    count: myExcusesCount,
  } = await supabase
    .from("excuses")
    .select("id, game, character_name, situation, excuse, created_at", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + pageSize - 1);
  if (myExcusesError?.code === "PGRST103" && currentPage > 1) {
    redirect("/profile#my-excuses-heading");
  }

  const totalPages = Math.max(1, Math.ceil((myExcusesCount ?? 0) / pageSize));
  if (!myExcusesError && currentPage > totalPages) {
    redirect("/profile#my-excuses-heading");
  }

  const myVoteCounts = new Map<string, { valid: number; skillIssue: number }>();

  let myCountsFailed = false;

  if (myExcuses?.length) {
    const { data: counts, error: countsError } = await supabase.rpc(
      "get_excuse_vote_counts",
      { excuse_ids: myExcuses.map((item) => item.id) },
    );

    myCountsFailed = Boolean(countsError) || !Array.isArray(counts);

    if (Array.isArray(counts)) {
      for (const row of counts) {
        myVoteCounts.set(row.excuse_id, {
          valid: Number(row.valid_count),
          skillIssue: Number(row.skill_issue_count),
        });
      }
    }
  }

  function myExcusesPageHref(pageNumber: number) {
    return pageNumber === 1
      ? "/profile#my-excuses-heading"
      : `/profile?page=${pageNumber}#my-excuses-heading`;
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
          <Link href="/create">Create</Link>
          <Link href="/profile" aria-current="page">
            My Profile
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <main>
        <div className="profile-heading">
          <p className="eyebrow">Your corner of the lobby</p>
          <h1>My Profile</h1>
          <p className="profile-description">
            Put a name and a face to the player behind the laughs.
          </p>
        </div>

        <div className="profile-layout">
          <aside className="profile-panel" aria-label="Profile photo">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Your profile photo"
                width={144}
                height={144}
                unoptimized
                className="profile-avatar"
              />
            ) : (
              <div
                className="profile-avatar profile-avatar-placeholder"
                role="img"
                aria-label="No profile photo uploaded"
              >
                {profile.first_name?.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}

            {photoError && (
              <p className="profile-notice profile-notice-error" role="alert">
                Could not load your photo. Try refreshing the page.
              </p>
            )}

            <div className="profile-upload">
              <ProfilePhotoUpload />
            </div>
          </aside>

          <section className="profile-panel" aria-labelledby="details-heading">
            <h2 id="details-heading">Personal details</h2>
            <p className="profile-muted">Update your name whenever you like.</p>

            {needsName && (
              <p className="profile-notice">
                Welcome! Add your first and last name to finish setting up your
                profile.
              </p>
            )}

            {status === "saved" && (
              <p
                className="profile-notice profile-notice-success"
                role="status"
              >
                Your profile has been saved.
              </p>
            )}

            {status === "invalid" && (
              <p className="profile-notice profile-notice-error" role="alert">
                Enter both names, using at most 100 characters each.
              </p>
            )}

            {status === "error" && (
              <p className="profile-notice profile-notice-error" role="alert">
                Could not save your profile. Please try again.
              </p>
            )}

            <form action={saveProfile} className="profile-form">
              <div className="profile-fields">
                <div className="profile-field">
                  <label htmlFor="first_name">First name</label>
                  <input
                    id="first_name"
                    name="first_name"
                    autoComplete="given-name"
                    defaultValue={profile.first_name ?? ""}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="last_name">Last name</label>
                  <input
                    id="last_name"
                    name="last_name"
                    autoComplete="family-name"
                    defaultValue={profile.last_name ?? ""}
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              <button type="submit">Save changes</button>
            </form>
          </section>
        </div>

        <section aria-labelledby="my-excuses-heading">
          <div className="collection-heading">
            <h2 id="my-excuses-heading">My excuses</h2>
          </div>

          {myExcusesError ? (
            <p className="empty-state" role="alert">
              Could not load your excuses. Please refresh and try again.
            </p>
          ) : !myExcuses?.length ? (
            <p className="empty-state">
              You haven’t published any excuses yet.{" "}
              <Link href="/create">Create your first excuse.</Link>
            </p>
          ) : (
            <ul className="joke-grid">
              {myExcuses.map((item) => (
                <li key={item.id}>
                  <article className="joke-card" data-game={item.game}>
                    <span className="joke-number">
                      {item.game === "valorant"
                        ? "Valorant"
                        : item.game === "league"
                          ? "League of Legends"
                          : item.game === "overwatch"
                            ? "Overwatch"
                            : "Unknown game"}
                      {item.character_name && ` · ${item.character_name}`}
                    </span>

                    {item.situation && (
                      <div className="incident-report">
                        <p className="report-label">Incident report</p>
                        <p>{item.situation}</p>
                      </div>
                    )}

                    <p className="report-label">Your defense</p>
                    <h3>{item.excuse}</h3>
                    <div className="vote-controls">
                      {myCountsFailed ? (
                        <p className="profile-muted" role="status">
                          Vote counts are unavailable. Refresh to try again.
                        </p>
                      ) : (
                        <p className="profile-muted">
                          Valid excuse ·{" "}
                          {myVoteCounts.get(item.id)?.valid ?? "—"}
                          {" / "}
                          Skill issue ·{" "}
                          {myVoteCounts.get(item.id)?.skillIssue ?? "—"}
                        </p>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
          {!myExcusesError && Boolean(myExcuses?.length) && (
            <nav className="pagination" aria-label="My excuses pages">
              {currentPage > 1 ? (
                <Link href={myExcusesPageHref(currentPage - 1)}>
                  ← Previous
                </Link>
              ) : (
                <span aria-disabled="true">← Previous</span>
              )}

              <span>
                Page {currentPage} of {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link href={myExcusesPageHref(currentPage + 1)}>Next →</Link>
              ) : (
                <span aria-disabled="true">Next →</span>
              )}
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}
