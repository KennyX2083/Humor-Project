import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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