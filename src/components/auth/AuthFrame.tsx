import { BrandMark } from "@puckoops/camelot";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth.module.css";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.wash} />
      <Link href="/" className={styles.brand}>
        <BrandMark size={22} />
        <span>ORBIT</span>
      </Link>
      <main className={styles.card}>{children}</main>
      <p className={`caption ${styles.foot}`}>A Puckoops product.</p>
    </div>
  );
}
