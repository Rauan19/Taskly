"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginAction, registerAction } from "@/actions/auth";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/schemas";

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((data) =>
    start(async () => {
      setError("");
      const res = await loginAction(data, next);
      if (res && !res.ok) setError(res.error);
    }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" type="password" autoComplete="current-password" className="input" {...register("password")} />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary h-10 w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      <p className="text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link className="font-medium text-accent hover:underline" href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((data) =>
    start(async () => {
      setError("");
      const res = await registerAction(data, next);
      if (res && !res.ok) setError(res.error);
    }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" autoComplete="name" className="input" {...register("name")} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary h-10 w-full" disabled={pending}>{pending ? "Criando…" : "Criar conta"}</button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link className="font-medium text-accent hover:underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
          Entrar
        </Link>
      </p>
    </form>
  );
}
