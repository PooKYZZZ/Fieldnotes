"use client";

import Link from "next/link";
import { CircleUserRound, LogIn } from "lucide-react";
import { authClient } from "@/features/auth/auth-client";

export function AccountNavigation() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <span className="nav-link" role="status"><CircleUserRound size={17} aria-hidden="true" /><span>Account</span></span>;
  }

  if (!session) {
    return <Link className="nav-link" href="/sign-in?returnTo=%2Faccount">
      <LogIn size={17} aria-hidden="true" /><span>Sign in</span>
    </Link>;
  }

  return <Link className="nav-link" href="/account" aria-label={`Account for ${session.user.email}`}>
    <CircleUserRound size={17} aria-hidden="true" /><span>Account</span>
  </Link>;
}
