"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function GameFilter({
  selectedGame,
  selectedSort,
}: {
  selectedGame: string;
  selectedSort: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(game: string, sort: string) {
    const params = new URLSearchParams();

    if (game !== "all") params.set("game", game);
    if (sort !== "newest") params.set("sort", sort);

    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/?${query}` : "/", { scroll: false });
    });
  }

  return (
    <div className="game-filter">
      <label htmlFor="game-filter">Game</label>
      <select
        id="game-filter"
        value={selectedGame}
        disabled={pending}
        onChange={(event) =>
          navigate(event.target.value, selectedSort)
        }
      >
        <option value="all">All games</option>
        <option value="valorant">Valorant</option>
        <option value="league">League of Legends</option>
        <option value="overwatch">Overwatch</option>
      </select>

      <label htmlFor="sort-filter">Sort</label>
      <select
        id="sort-filter"
        value={selectedSort}
        disabled={pending}
        onChange={(event) =>
          navigate(selectedGame, event.target.value)
        }
      >
        <option value="newest">Newest</option>
        <option value="valid">Most valid excuses</option>
        <option value="skill">Most skill issues</option>
      </select>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(() => router.refresh());
        }}
      >
        {pending ? "Loading…" : "↻ Refresh"}
      </button>
    </div>
  );
}