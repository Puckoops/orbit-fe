import type { Metadata } from "next";
import { Suspense } from "react";
import { Clients } from "@/components/clients/Clients";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <Suspense>
      <Clients />
    </Suspense>
  );
}
