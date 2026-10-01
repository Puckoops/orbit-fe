import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarScreen } from "@/components/calendar/CalendarScreen";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarScreen />
    </Suspense>
  );
}
