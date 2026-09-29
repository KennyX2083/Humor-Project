import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import Image from "next/image";
import ProfilePhotoUpload from "../components/profile-photo-upload";

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
    <main style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontSize: 32 }}>My Profile</h1>

      {needsName && (
        <p>
          Please complete your profile by entering your first and last name.
        </p>
      )}

      {status === "saved" && <p role="status">Profile saved.</p>}
      {status === "invalid" && (
        <p role="alert">Enter both names, using at most 100 characters each.</p>
      )}
      {status === "error" && (
        <p role="alert">Could not save your profile. Please try again.</p>
      )}

      <form
        action={saveProfile}
        style={{ display: "grid", gap: 16, marginTop: 24 }}
      >
        <label htmlFor="first_name">First name</label>
        <input
          id="first_name"
          name="first_name"
          autoComplete="given-name"
          defaultValue={profile.first_name ?? ""}
          required
          maxLength={100}
          style={{ border: "1px solid #888", padding: 10, borderRadius: 6 }}
        />

        <label htmlFor="last_name">Last name</label>
        <input
          id="last_name"
          name="last_name"
          autoComplete="family-name"
          defaultValue={profile.last_name ?? ""}
          required
          maxLength={100}
          style={{ border: "1px solid #888", padding: 10, borderRadius: 6 }}
        />

        <button
          type="submit"
          style={{ border: "1px solid #888", padding: 10, borderRadius: 6 }}
        >
          Save profile
        </button>
      </form>

      { photoUrl && (
        <Image
          src={photoUrl}
          alt="Your profile photo"
          width={160}
          height={160}
          unoptimized
          style={{
            marginTop: 24,
            width: 160,
            height: 160,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      )}

      {photoError && <p>Could not load your profile photo.</p>}

      <ProfilePhotoUpload />
      <p style={{ marginTop: 24 }}>
        <Link href="/">Back to jokes</Link>
      </p>
    </main>
  );
}
