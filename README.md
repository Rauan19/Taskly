# Taskly

Gerenciamento de projetos e tarefas para pequenas equipes: quadros Kanban, checklists, comentários, anexos, prazos e atividade recente. Next.js full-stack (sem backend separado), Prisma + PostgreSQL (Neon).

**Stack:** Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · Prisma 6 · Zod · React Hook Form · dnd-kit · sharp · jose + bcryptjs.

## Rodando localmente

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e SESSION_SECRET
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Abra http://localhost:3000. O seed cria:

| Usuário | E-mail | Senha |
|---|---|---|
| Ana Demo (proprietária) | `demo@taskly.dev` | `demo12345` |
| Bruno Souza (membro) | `bruno@taskly.dev` | `demo12345` |

O seed é idempotente (não duplica). **Não rode o seed em produção** — ele cria usuários com senha conhecida.

### Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Connection string do Neon (use a **pooled**). Só existe no servidor. |
| `SESSION_SECRET` | Assina o cookie de sessão (≥ 32 caracteres). `openssl rand -base64 48` |
| `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `STORAGE_BUCKET` | Storage S3-compatível para anexos. Em desenvolvimento, se vazios, os arquivos vão para `.uploads/` (ignorado pelo Git). **Em produção são obrigatórios.** |

Nenhuma variável é `NEXT_PUBLIC_*`: nada sensível chega ao navegador. `.env` está no `.gitignore`; `.env.example` deve conter **apenas nomes, sem valores reais**.

## Deploy na Vercel

1. Suba o repositório no GitHub e importe o projeto na Vercel (framework: Next.js, detectado automaticamente).
2. Em **Settings → Environment Variables**, cadastre para *Production* (e *Preview*, se quiser): `DATABASE_URL`, `SESSION_SECRET`, `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `STORAGE_BUCKET`.
3. Crie as tabelas uma vez, da sua máquina, apontando para o banco de produção: `npx prisma db push` (ou use `npm run db:migrate` para ter histórico de migrations).
4. Faça o deploy. O `postinstall` roda `prisma generate` automaticamente.

## Scripts

`dev` · `build` · `start` · `typecheck` · `db:generate` · `db:push` · `db:migrate` · `db:seed`

## Estrutura

```
app/            rotas (App Router): (auth), (app)/dashboard|projects|tasks|my-tasks|profile, invitations, api
actions/        Server Actions (auth, projetos, membros, quadros/colunas, tarefas, checklist/comentários)
components/     UI; Client Components só onde há interação (board/, task/)
lib/auth        sessão (JWT em cookie httpOnly) e hash de senha
lib/permissions requireAuth / requireProjectMember / requireProjectAdmin / requireProjectOwner + regras de tarefa
lib/storage     interface StorageProvider (S3-compatível e disco local)
lib/queries.ts  leituras agregadas (sem N+1)
schemas/        validação Zod (usada no cliente e, de novo, no servidor)
prisma/         schema.prisma e seed.ts
proxy.ts        proteção de rotas (middleware do Next 16)
```

## Segurança

- Senhas com **bcrypt** (custo 12); `passwordHash` nunca sai do servidor (as queries usam `select`).
- Sessão: JWT assinado (HS256) em cookie `httpOnly`, `sameSite=lax`, `secure` em produção, 30 dias.
- `proxy.ts` redireciona visitantes para `/login?next=…` e logados para fora de `/login` e `/register`. É só uma primeira barreira: **toda action/route handler revalida no servidor**.
- **Autorização centralizada** em `lib/permissions`. Cada operação resolve o projeto a partir do recurso (tarefa → coluna → quadro → projeto) e exige vínculo:

| | OWNER | ADMIN | MEMBER |
|---|:-:|:-:|:-:|
| Ver projeto, comentar, anexar, mover tarefas, criar tarefas | ✅ | ✅ | ✅ |
| Editar tarefa / checklist / concluir | todas | todas | só as que criou ou que são dele |
| Excluir tarefa | todas | todas | só as que criou |
| Quadros e colunas | ✅ | ✅ | — |
| Convidar e remover membros | ✅ | ✅ (admins só o dono remove) | — |
| Alterar funções, excluir projeto | ✅ | — | — |

- Zod valida toda entrada no servidor; textos são tratados como texto puro (React escapa; sem HTML armazenado).
- Prisma parametriza as queries (as `$queryRaw` usam template tagged).
- **Rate limit** básico (login, cadastro, convites, uploads). É em memória, por instância: freia força bruta simples, mas em serverless cada instância tem seu contador. Para algo mais rígido, troque `lib/rate-limit.ts` por Upstash/Redis.
- Convites: o token só é aceito por quem está logado com **o e-mail convidado**.

### Anexos

- Aceita JPG, PNG, WEBP e PDF, até **4 MB** (o limite de corpo de requisição da Vercel é 4,5 MB).
- O tipo é detectado pelos **bytes reais** do arquivo (não pela extensão nem pelo MIME enviado) e revalidado no servidor.
- Imagens: orientação EXIF aplicada, metadados removidos, redimensionadas (máx. 1920 px) e convertidas para **WebP**. PDFs são guardados como estão.
- O banco guarda só metadados e a chave do objeto; o arquivo fica no storage. Os arquivos são entregues por `/api/attachments/[id]`, que confere se o usuário é membro do projeto (não há URL pública).
- Trocar de storage = implementar `StorageProvider` (`put/get/delete`) em `lib/storage/` e escolhê-lo em `getStorage()`.

## Decisões e limites conhecidos

- **Convites sem e-mail:** o convite gera um link (`/invitations/<token>`, válido por 7 dias) que o administrador copia e envia. Quem já tem conta também vê o convite pendente no dashboard. Envio automático de e-mail ficou de fora para manter o projeto pequeno.
- **Drag & drop:** durante o arrasto só o estado local muda; ao soltar, uma única Server Action grava a ordem final (apenas linhas que mudaram, em uma transação). Se falhar, o quadro volta ao estado anterior. No celular, segure o card ~0,2 s para arrastar; também dá para mover pelo seletor de coluna dentro da tarefa. Com filtros ativos o arrasto é desativado.
- **Em andamento** (dashboard) = tarefas abertas suas em colunas que não são a primeira nem a última do quadro. Mover uma tarefa para a última coluna a conclui; tirá-la de lá a reabre.
- Prazos usam o dia civil (fuso de São Paulo para "hoje/atrasada").
- Comentários e atividades são paginados (10 por vez, "Ver mais"); anexos mostram imagens com `loading="lazy"`.
