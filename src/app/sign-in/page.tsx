import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { authSetupMessage, configuredSocialProviders, getCurrentSession } from "@/features/auth/auth.server";
import { SignInPanel } from "@/features/auth/sign-in-panel";
import { safeReturnPath } from "@/features/auth/return-to";
import styles from "@/features/auth/auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

type SignInSearchParams = Promise<{ returnTo?: string | string[]; error?: string | string[]; accountDeleted?: string | string[] }>;

export default async function SignInPage({ searchParams }: { searchParams: SignInSearchParams }) {
  const query = await searchParams;
  const returnTo = safeReturnPath(typeof query.returnTo === "string" ? query.returnTo : undefined);
  let session = null;
  let sessionUnavailable = false;
  try {
    session = await getCurrentSession();
  } catch {
    sessionUnavailable = true;
  }

  return (
    <div className={styles.authPage}>
      <Link className={styles.authBackLink} href="/roadmap"><ArrowLeft size={15} aria-hidden="true" /> Back to the roadmap</Link>
      <header className={styles.authStory}>
        <p className={styles.authEyebrow}>Fieldnotes account</p>
        <h1>{session ? "Your Fieldnotes account" : "Sign in to Fieldnotes"}</h1>
        <p className={styles.authStoryLead}>Save your progress and evidence in a private notebook. The full curriculum is open to everyone.</p>
      </header>
      <div className={styles.authGrid}>
        {session ? (
          <section className={styles.authPanel} aria-labelledby="already-signed-in-title">
            <h2 id="already-signed-in-title">Welcome back, {session.user.name || "learner"}.</h2>
            <Link className="button button-primary" href={returnTo}>Continue to Fieldnotes</Link>
          </section>
        ) : (
          <SignInPanel
            providers={sessionUnavailable ? [] : configuredSocialProviders}
            returnTo={returnTo}
            setupMessage={sessionUnavailable
              ? "Sign-in storage is temporarily unavailable. Your public learning materials are still available. Try again shortly."
              : authSetupMessage}
            callbackError={query.error !== undefined}
            retrySetup={sessionUnavailable}
            accountDeleted={query.accountDeleted === "1"}
          />
        )}
        <section className={styles.authNotebook} aria-labelledby="auth-notebook-title">
          <h2 id="auth-notebook-title">What your notebook keeps</h2>
          <dl>
            <div><dt>Study</dt><dd>Your saved lesson and module statuses for picking up where you left off.</dd></div>
            <div><dt>Practice</dt><dd>Observations and verification notes from labs and troubleshooting.</dd></div>
            <div><dt>Build</dt><dd>Checkpoint evidence, project notes, and handoff details.</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
