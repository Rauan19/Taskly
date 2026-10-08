"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSession, destroySession } from "@/lib/auth/session";
import { dummyCompare, hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { run, UserError } from "@/lib/action";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/schemas";

/** Só aceita caminhos internos (evita open redirect). */
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

export async function registerAction(input: RegisterInput, next?: string) {
  return run(async () => {
    const data = registerSchema.parse(input);
    const ip = await clientIp();
    if (!rateLimit(`register:${ip}`, 5, 60 * 60_000)) throw new UserError("Muitas tentativas. Tente mais tarde.");

    const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (exists) throw new UserError("Este e-mail já está cadastrado.");

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) },
      select: { id: true },
    });
    await createSession(user.id);
    redirect(safeNext(next));
  });
}

export async function loginAction(input: LoginInput, next?: string) {
  return run(async () => {
    const data = loginSchema.parse(input);
    const ip = await clientIp();
    if (!rateLimit(`login:ip:${ip}`, 30, 15 * 60_000) || !rateLimit(`login:${ip}:${data.email}`, 8, 15 * 60_000)) {
      throw new UserError("Muitas tentativas. Aguarde alguns minutos.");
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      await dummyCompare(data.password);
      throw new UserError("E-mail ou senha incorretos.");
    }
    if (!(await verifyPassword(data.password, user.passwordHash))) throw new UserError("E-mail ou senha incorretos.");

    await createSession(user.id);
    redirect(safeNext(next));
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
