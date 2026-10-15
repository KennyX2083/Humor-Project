"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [selected, setSelected] = useState(initialVote);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

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

      setSelected(result.vote);
      setMessage("Vote saved.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save your vote."
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
          Valid excuse · {validCount ?? "—"}
        </button>

        <button
          type="button"
          aria-pressed={selected === -1}
          disabled={pending}
          onClick={() => submitVote(-1)}
        >
          Skill issue · {skillIssueCount ?? "—"}
        </button>
      </div>

      <p className="profile-muted" role="status" aria-live="polite">
        {pending ? "Saving vote…" : message}
      </p>
    </div>
  );
}