import "server-only";

/**
 * Abstração de armazenamento de arquivos. O resto da aplicação só conhece esta interface;
 * trocar de provedor (Neon Object Storage, R2, S3, ...) é implementar outra classe aqui.
 */
export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

let instance: StorageProvider | undefined;

export async function getStorage(): Promise<StorageProvider> {
  if (instance) return instance;
  // Variáveis AWS_* fornecidas pelo Neon Object Storage (qualquer S3-compatível serve).
  const env = process.env;
  const endpoint = env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const bucket = env.STORAGE_BUCKET;
  if (endpoint && accessKeyId && secretAccessKey && bucket) {
    const { S3Storage } = await import("./s3");
    instance = new S3Storage({
      endpoint,
      accessKeyId,
      secretAccessKey,
      bucket,
      region: env.AWS_REGION,
    });
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Storage não configurado: defina AWS_* e STORAGE_BUCKET nas variáveis de ambiente.");
    }
    const { LocalStorage } = await import("./local");
    instance = new LocalStorage(".uploads");
  }
  return instance;
}
