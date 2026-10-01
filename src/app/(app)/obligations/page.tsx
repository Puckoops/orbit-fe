import type { Metadata } from "next";
import { Suspense } from "react";
import { Obligations } from "@/components/obligations/Obligations";

export const metadata: Metadata = { title: "Obligations" };

export default function ObligationsPage() {
  return (
    <Suspense>
      <Obligations />
    </Suspense>
  );
}
