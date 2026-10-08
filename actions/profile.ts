"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { run, UserError } from "@/lib/action";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireAuth } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/utils";
import { registerSchema } from "@/schemas";

const nameSchema = registerSchema.shape.name;

const passwordSchema = z.object({
  current: z.string().min(1, "Informe a senha atual").max(72),
  next: registerSchema.shape.password,
});

export async function updateNameAction(name: string) {
  return run(async () => {
    const user = await requireAuth();
    const data = nameSchema.parse(name);
    await prisma.user.update({ where: { id: user.id }, data: { name: cleanText(data) } });
    revalidatePath("/", "layout");
  });
}

export async function changePasswordAction(input: { current: string; next: string }) {
  return run(async () => {
    const user = await requireAuth();
    if (!rateLimit(`pwd:${user.id}`, 5, 15 * 60_000)) throw new UserError("Muitas tentativas. Aguarde alguns minutos.");
    const data = passwordSchema.parse(input);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(data.current, row.passwordHash))) throw new UserError("Senha atual incorreta.");
    if (data.current === data.next) throw new UserError("A nova senha deve ser diferente da atual.");

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.next) } });
  });
}
