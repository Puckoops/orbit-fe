import type { Metadata } from "next";
import { Suspense } from "react";
import { Inventory } from "@/components/inventory/Inventory";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <Suspense>
      <Inventory />
    </Suspense>
  );
}
