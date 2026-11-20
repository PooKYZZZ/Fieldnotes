import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, FileCheck2, NotebookPen, Rocket } from "lucide-react";
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
      <div className={styles.authGrid}>
        <section className={styles.authStory} aria-labelledby="auth-title">
          <div className={styles.authStoryCopy}>
            <p className={styles.authEyebrow}>DevOps Fieldnotes · Learn, investigate, build</p>
            <h1 id="auth-title">Keep your engineering notes together.</h1>
            <p className={styles.authStoryLead}>The lessons stay open to everyone. An account keeps your investigation notes, activity records, and project checkpoints private to you.</p>
            <ol className={styles.learningLoop} aria-label="How Fieldnotes learning connects">
              <li><span><BookOpenCheck size={14} aria-hidden="true" /></span>Learn</li>
              <li><span><FileCheck2 size={14} aria-hidden="true" /></span>Investigate</li>
              <li><span><Rocket size={14} aria-hidden="true" /></span>Build</li>
              <li><span><NotebookPen size={14} aria-hidden="true" /></span>Review</li>
            </ol>
          </div>
          <p className={styles.authStoryFootnote}>Your account is for saved learning work. It does not unlock content, require an invitation, or track whether you are “active.”</p>
        </section>

        {session ? (
          <section className={`${styles.authPanel} ${styles.signedOutPanel}`} aria-labelledby="already-signed-in-title">
            <p className={styles.authPanelKicker}>Already signed in</p>
            <h2 id="already-signed-in-title">Welcome back, {session.user.name || "learner"}.</h2>
            <p>Your personal progress is ready to continue.</p>
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
      </div>
    </div>
  );
}
