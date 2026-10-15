"use client";

import { useState } from "react";

type Props = {
  excuseId: string;
  initialVote: number | null;
  validCount: number | null;
  skillIssueCount: number | null;
};

export default function ExcuseVoteButtons({
  excuseId,
  initialVote,
  validCount,
  skillIssueCount,
}: Props) {
  const [selected, setSelected] = useState(initialVote);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [counts, setCounts] = useState({
    valid: validCount,
    skillIssue: skillIssueCount,
  });

  async function submitVote(vote: 1 | -1) {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excuseId, vote }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save your vote.");
      }

      setSelected(vote);
      setCounts({
        valid: result.validCount ?? null,
        skillIssue: result.skillIssueCount ?? null,
      });
      setMessage(result.warning ?? "Vote saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save your vote.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="vote-controls">
      <div className="vote-buttons" role="group" aria-label="Rate this excuse">
        <button
          type="button"
          aria-pressed={selected === 1}
          disabled={pending}
          onClick={() => submitVote(1)}
        >
          Valid excuse · {counts.valid ?? "—"}
        </button>

        <button
          type="button"
          aria-pressed={selected === -1}
          disabled={pending}
          onClick={() => submitVote(-1)}
        >
          Skill issue · {counts.skillIssue ?? "—"}
        </button>
      </div>

      <p className="profile-muted" role="status" aria-live="polite">
        {pending ? "Saving vote…" : message}
      </p>
    </div>
  );
}
