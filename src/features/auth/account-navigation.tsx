"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LogIn, RefreshCw } from "lucide-react";
import { useAuthSession } from "@/features/auth/auth-session-context";

export function AccountNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const session = useAuthSession();
  const pathname = usePathname();

  if (session.status === "loading") {
    return <span className="nav-link" role="status"><CircleUserRound size={17} aria-hidden="true" /><span>Account</span></span>;
  }

  if (session.status === "unavailable") {
    return <button className="nav-link" type="button" onClick={() => void session.retry()}><RefreshCw size={17} aria-hidden="true" /><span>Account unavailable · retry</span></button>;
  }

  if (session.status === "signed-out") {
    return <Link className="nav-link" href="/sign-in?returnTo=%2Faccount" aria-current={pathname === "/sign-in" ? "page" : undefined} onClick={onNavigate}>
      <LogIn size={17} aria-hidden="true" /><span>Sign in</span>
    </Link>;
  }

  return <Link className="nav-link" href="/account" aria-label={`Account for ${session.email ?? "signed-in learner"}`} aria-current={pathname === "/account" ? "page" : undefined} onClick={onNavigate}>
    <CircleUserRound size={17} aria-hidden="true" /><span>Account</span>
  </Link>;
}
