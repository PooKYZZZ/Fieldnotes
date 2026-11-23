import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleUserRound } from "lucide-react";
import { getCurrentSession } from "@/features/auth/auth.server";
import { AccountActions } from "@/features/auth/account-actions";
import styles from "@/features/auth/auth.module.css";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  let session = null;
  let unavailable = false;
  try {
    session = await getCurrentSession();
  } catch {
    unavailable = true;
  }

  return (
    <div className={styles.authPage}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Sign-in and privacy</p>
          <h1>Your Fieldnotes account</h1>
          <p className="page-description">Manage the sign-in that keeps your learning records private.</p>
        </div>
      </header>

      {session ? (
        <section className={styles.accountCard} aria-labelledby="account-identity-title">
          <div className={styles.accountIdentity}>
            <span className={styles.accountAvatar} aria-hidden="true">
              <CircleUserRound size={25} />
            </span>
            <div>
              <h2 id="account-identity-title">{session.user.name || "Fieldnotes learner"}</h2>
              <p>{session.user.email}</p>
            </div>
          </div>
          <p className={styles.accountPrivacy}>Fieldnotes saves your marked lesson progress, lab and troubleshooting observations, and project checkpoint evidence to this account. <Link href="/progress">Open your progress notebook <ArrowRight size={13} aria-hidden="true" /></Link></p>
          <h3 className={styles.sessionHeading}>Manage your sessions</h3>
          <p className={styles.accountPrivacy}>Sessions can stay active for up to 30 days. Lessons and references remain available when you sign out.</p>
          <AccountActions />
          <p className={styles.authStoryFootnote}>Deleting an account requires a sign-in within the last 10 minutes and an explicit confirmation. Read the <Link href="/privacy">Privacy notice</Link>.</p>
        </section>
      ) : (
        <section className={`${styles.accountCard} ${styles.signedOutPanel}`} aria-labelledby="account-sign-in-title">
          <span className={styles.accountAvatar} aria-hidden="true"><BookOpenCheck size={24} /></span>
          <h2 id="account-sign-in-title">{unavailable ? "Account services are unavailable" : "Sign in to use your private notebook"}</h2>
          <p>{unavailable ? "Your records have not been changed. Try again in a moment; the learning content remains public." : "You can browse lessons and activities without an account. Sign in when you want Fieldnotes to save your personal progress."}</p>
          {!unavailable && <Link className="button button-primary" href="/sign-in?returnTo=%2Faccount">Sign in <ArrowRight size={15} aria-hidden="true" /></Link>}
          <Link className="button button-outline" href="/roadmap">Continue exploring</Link>
        </section>
      )}
    </div>
  );
}
