import { createClient } from "../lib/supabase/server";
import SignOutButton from "./components/google-sign-out-button";
import GoogleSignInButton from "./components/google-sign-in-button"; 
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  
    if (profileError) {
      return <main> Could not load profile. Please refresh and try again. </main>
    }

    if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
      redirect("/profile");
    }
  }

  console.log("Auth check:", {
    signedIn: Boolean(user),
    error: authError?.message,
  });

  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline")
    .order("id");

  if (error) {
    console.error("Could not load jokes:", error.message);
    return <main>Could not load jokes. Check your terminal for details.</main>;
  }

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
      {user ? (
        <div>
          <p>
            <Link href="/profile"> My Profile </Link>
          </p>

          <SignOutButton/>
        </div>
      ) : (
        <GoogleSignInButton/>
      )}

      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Jokes</h1>

      {jokes.length === 0 ? (
        <p>No jokes found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {jokes.map((joke) => (
            <li
              key={joke.id}
              style={{
                border: "1px solid #888",
                borderRadius: 8,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontWeight: "bold" }}>{joke.setup}</h2>
              <p style={{ marginTop: 8 }}>{joke.punchline}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}