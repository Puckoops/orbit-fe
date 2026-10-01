import type { Metadata } from "next";
import { Suspense } from "react";
import { Payments } from "@/components/payments/Payments";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <Suspense>
      <Payments />
    </Suspense>
  );
}
