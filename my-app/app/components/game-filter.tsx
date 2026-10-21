"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  selectedGame: string;
  selectedSort: string;
  selectedScope: string;
  canViewMine: boolean;
};

export default function GameFilter({
  selectedGame,
  selectedSort,
  selectedScope,
  canViewMine,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(game: string, sort: string, scope: string) {
    const params = new URLSearchParams();

    if (game !== "all") params.set("game", game);
    if (sort !== "newest") params.set("sort", sort);
    if (scope === "mine" && canViewMine) {
      params.set("scope", "mine");
    }

    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/?${query}` : "/", { scroll: false });
    });
  }

  return (
    <div className="game-filter">
      {canViewMine && (
        <>
          <label htmlFor="scope-filter">Show</label>
          <select
            id="scope-filter"
            value={selectedScope}
            disabled={pending}
            onChange={(event) =>
              navigate(selectedGame, selectedSort, event.target.value)
            }
          >
            <option value="all">Everyone</option>
            <option value="mine">Mine</option>
          </select>
        </>
      )}

      <label htmlFor="game-filter">Game</label>
      <select
        id="game-filter"
        value={selectedGame}
        disabled={pending}
        onChange={(event) =>
          navigate(event.target.value, selectedSort, selectedScope)
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
          navigate(selectedGame, event.target.value, selectedScope)
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