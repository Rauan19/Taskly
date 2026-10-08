"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction, declineInvitationAction } from "@/actions/members";

export function InvitationActions({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-5 space-y-3">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          className="btn-primary h-10 flex-1"
          disabled={pending}
          onClick={() => start(async () => {
            const r = await acceptInvitationAction(token);
            if (!r.ok) setError(r.error);
            else router.push(`/projects/${r.data.projectId}/board`);
          })}
        >
          Aceitar convite
        </button>
        <button
          className="btn-secondary h-10"
          disabled={pending}
          onClick={() => start(async () => { await declineInvitationAction(token); router.push("/dashboard"); })}
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
