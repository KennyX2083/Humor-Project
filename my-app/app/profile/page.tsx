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
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
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

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            h.
          </span>
          Humor Lab
        </Link>

        <nav className="header-actions" aria-label="Account">
          <Link href="/">Back to jokes</Link>
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
      </main>
    </div>
  );
}
