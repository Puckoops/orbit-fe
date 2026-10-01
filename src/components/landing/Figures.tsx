"use client";

import { FigureCard, Sparkbars } from "@puckoops/camelot";

const gbp = (major: number) => `£${Math.round(major).toLocaleString("en-GB")}`;

export function OutstandingFigure() {
  return (
    <FigureCard
      label="Outstanding"
      value={48320}
      hero
      format={gbp}
      caption="Receivable across 9 open invoices, 3 of them past their due date."
      footer={<Sparkbars values={[3, 5, 4, 7, 6, 8, 5, 9, 7, 12, 10, 11]} />}
    />
  );
}

export function CollectedFigure({ className }: { className?: string }) {
  return <FigureCard label="Collected this quarter" value={126900} format={gbp} caption="Across 6 clients and 19 invoices." className={className} />;
}
