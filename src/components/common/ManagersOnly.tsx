import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@puckoops/camelot";

export function ManagersOnly({ what }: { what: string }) {
  return <EmptyState framed icon={Wallet01Icon} title={`Only owners and managers see ${what}.`} description="Ask a workspace owner if you need access." />;
}
