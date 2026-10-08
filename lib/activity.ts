import "server-only";
import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export function logActivity(input: {
  projectId: string;
  userId: string;
  type: ActivityType;
  description: string;
  taskId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.activity.create({ data: input });
}
