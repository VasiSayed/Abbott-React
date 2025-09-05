import React, { useState } from "react";
import { openEvent } from "../utils/api";

type Props = {
  code: string;
  onError?: (msg: string) => void;
  disabled?: boolean;
  accent?: string | null;
};

export default function JoinButton({ code, onError, disabled, accent }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const { data } = await openEvent(code);
      if (data.ok && data.link) {
        window.location.href = data.link;
        return;
      }
      onError?.(data.message || "Unable to join right now.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Join failed.";
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="join-btn"
      style={{ background: accent ?? "#1e90ff" }}
      onClick={handleClick}
      disabled={!!disabled || loading}
      aria-busy={loading}
    >
      {loading ? "OPENING..." : "CLICK HERE TO JOIN"}
    </button>
  );
}
