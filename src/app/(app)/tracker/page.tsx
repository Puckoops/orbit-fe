import type { Metadata } from "next";
import { Suspense } from "react";
import { Tracker } from "@/components/tracker/Tracker";

export const metadata: Metadata = { title: "Tracker" };

export default function TrackerPage() {
  return (
    <Suspense>
      <Tracker />
    </Suspense>
  );
}
