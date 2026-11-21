"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LogIn } from "lucide-react";
import { useAuthSession } from "@/features/auth/auth-session-context";

export function AccountNavigation() {
  const { userId, email, pending } = useAuthSession();
  const pathname = usePathname();

  if (pending) {
    return <span className="nav-link" role="status"><CircleUserRound size={17} aria-hidden="true" /><span>Account</span></span>;
  }

  if (!userId) {
    return <Link className="nav-link" href="/sign-in?returnTo=%2Faccount" aria-current={pathname === "/sign-in" ? "page" : undefined}>
      <LogIn size={17} aria-hidden="true" /><span>Sign in</span>
    </Link>;
  }

  return <Link className="nav-link" href="/account" aria-label={`Account for ${email ?? "signed-in learner"}`} aria-current={pathname === "/account" ? "page" : undefined}>
    <CircleUserRound size={17} aria-hidden="true" /><span>Account</span>
  </Link>;
}
