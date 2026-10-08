import { PrismaClient, type Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo12345";
const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(12, 0, 0, 0);
  return d;
};

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@taskly.dev" },
    update: {},
    create: { name: "Ana Demo", email: "demo@taskly.dev", passwordHash },
  });
  const bruno = await prisma.user.upsert({
    where: { email: "bruno@taskly.dev" },
    update: {},
    create: { name: "Bruno Souza", email: "bruno@taskly.dev", passwordHash },
  });

  const exists = await prisma.project.findFirst({ where: { ownerId: demo.id, name: "Lançamento do site" } });
  if (exists) {
    console.log("Seed já aplicado (projeto demo existe). Nada a fazer.");
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: "Lançamento do site",
      description: "Projeto de demonstração: novo site institucional da empresa.",
      color: "#0d7c66",
      ownerId: demo.id,
      members: {
        create: [
          { userId: demo.id, role: "OWNER" },
          { userId: bruno.id, role: "MEMBER" },
        ],
      },
      boards: {
        create: {
          name: "Quadro principal",
          columns: {
            create: [
              { name: "A Fazer", position: 0 },
              { name: "Em andamento", position: 1, color: "#2563eb" },
              { name: "Em revisão", position: 2, color: "#c2410c" },
              { name: "Concluído", position: 3, color: "#0d7c66" },
            ],
          },
        },
      },
    },
    include: { boards: { include: { columns: { orderBy: { position: "asc" } } } } },
  });
  const [todo, doing, review, done] = project.boards[0].columns;

  type Seed = { col: string; title: string; priority: Priority; due?: number; who?: string; desc?: string; check?: [string, boolean][]; completed?: boolean };
  const tasks: Seed[] = [
    { col: todo.id, title: "Definir paleta de cores", priority: "MEDIUM", due: 5, who: bruno.id },
    { col: todo.id, title: "Escrever textos da página inicial", priority: "HIGH", due: 2, who: demo.id, desc: "Hero, benefícios e chamada para ação.", check: [["Rascunho", true], ["Revisão", false], ["Aprovação", false]] },
    { col: todo.id, title: "Configurar domínio e DNS", priority: "LOW" },
    { col: doing.id, title: "Montar layout responsivo", priority: "URGENT", due: -1, who: demo.id, check: [["Desktop", true], ["Tablet", true], ["Celular", false]] },
    { col: doing.id, title: "Integrar formulário de contato", priority: "HIGH", due: 0, who: bruno.id },
    { col: review.id, title: "Revisar acessibilidade", priority: "MEDIUM", due: 3, who: demo.id },
    { col: done.id, title: "Escolher plataforma de hospedagem", priority: "MEDIUM", who: demo.id, completed: true },
    { col: done.id, title: "Levantar requisitos", priority: "LOW", who: bruno.id, completed: true },
  ];

  const positions = new Map<string, number>();
  for (const t of tasks) {
    const position = positions.get(t.col) ?? 0;
    positions.set(t.col, position + 1);
    const created = await prisma.task.create({
      data: {
        columnId: t.col,
        title: t.title,
        description: t.desc,
        priority: t.priority,
        position,
        dueDate: t.due === undefined ? null : day(t.due),
        completedAt: t.completed ? new Date() : null,
        createdById: demo.id,
        assignedToId: t.who ?? null,
        checklist: t.check
          ? { create: t.check.map(([title, completed], i) => ({ title, completed, position: i })) }
          : undefined,
      },
    });
    if (t.title === "Montar layout responsivo") {
      await prisma.comment.create({ data: { taskId: created.id, userId: bruno.id, content: "Já subi o protótipo do desktop para revisão." } });
    }
  }

  await prisma.activity.createMany({
    data: [
      { projectId: project.id, userId: demo.id, type: "PROJECT_CREATED", description: 'criou o projeto "Lançamento do site"' },
      { projectId: project.id, userId: demo.id, type: "MEMBER_ADDED", description: "adicionou Bruno Souza ao projeto" },
    ],
  });

  console.log(`Seed concluído.\n  Login: demo@taskly.dev / ${DEMO_PASSWORD}\n  Segundo usuário: bruno@taskly.dev / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
