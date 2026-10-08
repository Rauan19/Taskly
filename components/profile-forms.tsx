"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { changePasswordAction, updateNameAction } from "@/actions/profile";
import { registerSchema } from "@/schemas";

const nameForm = z.object({ name: registerSchema.shape.name });
const passwordForm = z
  .object({
    current: z.string().min(1, "Informe a senha atual"),
    next: registerSchema.shape.password,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "As senhas não conferem" });

type Msg = { ok: boolean; text: string } | null;

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-accent" : "text-sm text-red-600"}>
      {msg.text}
    </p>
  );
}

export function NameForm({ name }: { name: string }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof nameForm>>({
    resolver: zodResolver(nameForm),
    defaultValues: { name },
  });
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={handleSubmit((d) =>
        start(async () => {
          const r = await updateNameAction(d.name);
          setMsg(r.ok ? { ok: true, text: "Nome atualizado." } : { ok: false, text: r.error });
        }),
      )}
    >
      <div>
        <label className="label" htmlFor="pf-name">Nome</label>
        <input id="pf-name" className="input" autoComplete="name" {...register("name")} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>Salvar nome</button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.input<typeof passwordForm>>({
    resolver: zodResolver(passwordForm),
  });
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={handleSubmit((d) =>
        start(async () => {
          const r = await changePasswordAction({ current: d.current, next: d.next });
          if (r.ok) {
            reset();
            setMsg({ ok: true, text: "Senha alterada." });
          } else setMsg({ ok: false, text: r.error });
        }),
      )}
    >
      <div>
        <label className="label" htmlFor="pf-cur">Senha atual</label>
        <input id="pf-cur" type="password" autoComplete="current-password" className="input" {...register("current")} />
        {errors.current && <p className="field-error">{errors.current.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="pf-new">Nova senha</label>
        <input id="pf-new" type="password" autoComplete="new-password" className="input" {...register("next")} />
        {errors.next && <p className="field-error">{errors.next.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="pf-conf">Confirmar nova senha</label>
        <input id="pf-conf" type="password" autoComplete="new-password" className="input" {...register("confirm")} />
        {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>Alterar senha</button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}
