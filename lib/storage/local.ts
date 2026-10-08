import { promises as fs } from "node:fs";
import path from "node:path";
import type { StorageProvider } from "./index";

/** Apenas para desenvolvimento local (sistema de arquivos). Em produção use S3Storage. */
export class LocalStorage implements StorageProvider {
  private root: string;

  constructor(dir: string) {
    this.root = path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
  }

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Chave inválida");
    return full;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    await fs.writeFile(file + ".type", contentType);
  }

  async get(key: string) {
    const file = this.resolve(key);
    try {
      const [body, type] = await Promise.all([fs.readFile(file), fs.readFile(file + ".type", "utf8")]);
      return { body, contentType: type };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const file = this.resolve(key);
    await fs.rm(file, { force: true });
    await fs.rm(file + ".type", { force: true });
  }
}
