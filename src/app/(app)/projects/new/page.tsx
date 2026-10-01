import type { Metadata } from "next";
import { Suspense } from "react";
import { NewProject } from "@/components/projects/NewProject";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProject />
    </Suspense>
  );
}
