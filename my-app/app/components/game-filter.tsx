"use client";

import { useRouter } from "next/navigation";

export default function GameFilter({
  selectedGame,
}: {
  selectedGame: string;
}) {
  const router = useRouter();

  return (
    <div className="game-filter">
      <label htmlFor="game-filter">Game</label>
      <select
        id="game-filter"
        value={selectedGame}
        onChange={(event) => {
          const game = event.target.value;

          router.push(
            game === "all" ? "/" : `/?game=${game}`,
            { scroll: false }
          );
        }}
      >
        <option value="all">All games</option>
        <option value="valorant">Valorant</option>
        <option value="league">League of Legends</option>
        <option value="overwatch">Overwatch</option>
      </select>
    </div>
  );
}