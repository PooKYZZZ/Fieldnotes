"use client";

import { RefreshCw } from "lucide-react";
import styles from "@/features/auth/auth.module.css";

export function AuthUnavailableNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className={styles.progressSignInNotice} role="status">
    <p>{message}</p>
    <div><button type="button" onClick={onRetry}><RefreshCw size={13} aria-hidden="true" /> Retry account check</button></div>
  </div>;
}
