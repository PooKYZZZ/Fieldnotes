"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import styles from "@/features/auth/auth.module.css";

export function ProgressSignInNotice({ children, reloadAfterSignIn = true }: { children: string; reloadAfterSignIn?: boolean }) {
  const pathname = usePathname();
  const href = `/sign-in?returnTo=${encodeURIComponent(pathname || "/")}`;

  return <div className={styles.progressSignInNotice} role="status">
    <p>{children}</p>
    <div>
      <Link href={href} target="_blank" rel="noreferrer">Sign in in a new tab <ArrowUpRight size={14} aria-hidden="true" /></Link>
      {reloadAfterSignIn && <button type="button" onClick={() => window.location.reload()}><RefreshCw size={13} aria-hidden="true" /> Reload after signing in</button>}
    </div>
  </div>;
}
