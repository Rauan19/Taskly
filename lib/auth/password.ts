import "server-only";
import bcrypt from "bcryptjs";

const ROUNDS = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, ROUNDS);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Gasta o mesmo tempo de um login real quando o e-mail não existe (evita enumeração por timing).
let dummy: Promise<string> | undefined;
export async function dummyCompare(password: string) {
  dummy ??= hashPassword("taskly-dummy");
  await verifyPassword(password, await dummy);
}
