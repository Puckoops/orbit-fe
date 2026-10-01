import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientFolder } from "@/components/clients/ClientFolder";

export const metadata: Metadata = { title: "Client folder" };

export default async function ClientFolderPage({ params }: PageProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  return (
    <Suspense>
      <ClientFolder clientId={clientId} />
    </Suspense>
  );
}
