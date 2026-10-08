"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";

export function TaskModal({ closeHref, children }: { closeHref: string; children: React.ReactNode }) {
  const router = useRouter();
  const close = useCallback(() => router.push(closeHref, { scroll: false }), [router, closeHref]);
  return (
    <Modal title="Tarefa" onClose={close} wide>
      {children}
    </Modal>
  );
}
