import { File01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@puckoops/camelot";
import styles from "./common.module.css";

export function FileName({ name }: { name: string }) {
  return (
    <span className={styles.fileName} title={name}>
      <Icon icon={File01Icon} size={16} className={styles.fileIcon} />
      <span className={styles.ellipsis}>{name}</span>
    </span>
  );
}
