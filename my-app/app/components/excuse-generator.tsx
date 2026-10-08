"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ExcuseGenerator() {
  const router = useRouter();
  const [game, setGame] = useState("valorant");
  const [situation, setSituation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = new FormData(form);

    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/excuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          character: fields.get("character"),
          situation,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not generate an excuse.");
      }

      form.reset();
      setSituation("");
      setMessage("Published. Your defense is in the feed.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="queue-generator" aria-labelledby="generator-heading">
      <div className="generator-heading">
        <h2 id="generator-heading">What went wrong?</h2>
        <span className="section-code">NEW REPORT / 01</span>
      </div>

      <form onSubmit={generate}>
        <fieldset className="queue-fields" disabled={pending}>
          <legend className="sr-only">Excuse details</legend>

          <fieldset className="game-picker">
            <legend>Choose your game</legend>

            {[
              { value: "valorant", label: "Valorant" },
              { value: "league", label: "League of Legends" },
            ].map((option) => (
              <label className="game-choice" key={option.value}>
                <input
                  type="radio"
                  name="game"
                  value={option.value}
                  checked={game === option.value}
                  onChange={() => setGame(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="queue-field">
            <label htmlFor="character">
              {game === "valorant" ? "Agent" : "Champion"}
              <span>optional</span>
            </label>
            <input
              id="character"
              name="character"
              placeholder={game === "valorant" ? "e.g. Jett" : "e.g. Yasuo"}
              maxLength={100}
            />
          </div>

          <div className="queue-field">
            <label htmlFor="situation">The incident</label>
            <textarea
              id="situation"
              name="situation"
              placeholder={
                game === "valorant"
                  ? "Flashed my team. Missed every shot. Blamed the ping."
                  : "Went 0/9. Told everyone I was scaling."
              }
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              minLength={5}
              maxLength={1000}
              rows={3}
              required
              aria-describedby="situation-count"
            />
            <span className="field-count" id="situation-count">
              {situation.length}/1000
            </span>
          </div>

          <div className="generator-bottom">
            <p>AI-generated. Published for everyone to judge.</p>
            <button className="generate-button" type="submit">
              {pending ? "Building your defense…" : "Generate excuse"}
              <span aria-hidden="true">{pending ? "…" : "↗"}</span>
            </button>
          </div>
        </fieldset>

        <div
          className="generation-status"
          role="status"
          aria-live="polite"
        >
          {pending ? "Reviewing the incident…" : message}
        </div>

        {error && <p className="queue-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}