import type { Metadata } from "next";
import { ProjectForm } from "@/components/project-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Novo projeto" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6">
      <PageHeader title="Novo projeto" subtitle="Criamos um quadro com A Fazer, Em andamento e Concluído." />
      <div className="card p-5">
        <ProjectForm />
      </div>
    </div>
  );
}
