import { z } from "zod";

const date = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")]);
const id = z.string().min(1).max(64);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72, "Máximo de 72 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha").max(72),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Mínimo de 2 caracteres").max(60),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const columnSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

export const boardNameSchema = z.object({ name: z.string().trim().min(1, "Informe o nome").max(60) });

const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const taskCreateSchema = z.object({
  columnId: id,
  title: z.string().trim().min(1, "Informe o título").max(160),
  description: z.string().trim().max(5000).optional(),
  priority: priority.default("MEDIUM"),
  dueDate: date.optional(),
  assignedToId: id.nullable().optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, "Informe o título").max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  priority: priority.optional(),
  dueDate: date.nullable().optional(),
  assignedToId: id.nullable().optional(),
});

export const checklistTitleSchema = z.string().trim().min(1, "Informe o item").max(200);
export const commentSchema = z.string().trim().min(1, "Escreva um comentário").max(2000);

export const moveTaskSchema = z.object({
  taskId: id,
  toColumnId: id,
  orderedIds: z.array(id).min(1).max(500),
  fromOrderedIds: z.array(id).max(500).optional(),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type InviteInput = z.input<typeof inviteSchema>;
export type TaskCreateInput = z.input<typeof taskCreateSchema>;
export type TaskUpdateInput = z.input<typeof taskUpdateSchema>;
export { id as idSchema };
