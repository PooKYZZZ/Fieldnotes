"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, LoaderCircle } from "lucide-react";
import { authClient } from "@/features/auth/auth-client";
import { safeReturnPath } from "@/features/auth/return-to";
import type { SocialProvider } from "@/features/auth/auth.server";
import styles from "@/features/auth/auth.module.css";

export function SignInPanel({
  providers,
  returnTo,
  setupMessage,
  callbackError,
  retrySetup = false,
  accountDeleted = false,
}: {
  providers: SocialProvider[];
  returnTo?: string;
  setupMessage?: string;
  callbackError?: boolean;
  retrySetup?: boolean;
  accountDeleted?: boolean;
}) {
  const router = useRouter();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState(callbackError ? "Sign-in did not finish. Try again or choose another provider." : "");
  const safeDestination = safeReturnPath(returnTo);

  async function startSignIn(provider: SocialProvider) {
    setPendingProvider(provider);
    setMessage("");
    try {
      const errorDestination = new URL("/sign-in", window.location.origin);
      errorDestination.searchParams.set("returnTo", safeDestination);
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}${safeDestination}`,
        errorCallbackURL: errorDestination.toString(),
      });
      if (result.error) {
        setMessage("Sign-in could not start. Check your connection and try again.");
        setPendingProvider(null);
      }
    } catch {
      setMessage("Sign-in could not start. Check your connection and try again.");
      setPendingProvider(null);
    }
  }

  return (
    <div className={styles.authPanel}>
      <div className={styles.authPanelHeading}>
        <p className={styles.authPanelKicker}>Your Fieldnotes account</p>
        <h2>Keep your progress with you</h2>
        <p>Sign in to save notes and checkpoints privately to your account.</p>
      </div>

      {providers.length ? (
        <div className={styles.providerList} aria-label="Sign-in providers">
          {providers.includes("google") && <button
            className={styles.providerButton}
            type="button"
            disabled={pendingProvider !== null}
            onClick={() => void startSignIn("google")}
          >
            {pendingProvider === "google" ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <Image className={styles.googleMark} src="/brand/google-g-mark.png" width={24} height={24} alt="" aria-hidden="true" />}
            <span>{pendingProvider === "google" ? "Connecting to Google…" : "Continue with Google"}</span>
          </button>}
          {providers.includes("github") && <button
            className={styles.providerButton}
            type="button"
            disabled={pendingProvider !== null}
            onClick={() => void startSignIn("github")}
          >
            {pendingProvider === "github" ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <Code2 size={19} aria-hidden="true" />}
            <span>{pendingProvider === "github" ? "Connecting to GitHub…" : "Continue with GitHub"}</span>
          </button>}
        </div>
      ) : (
        <div className={styles.setupNotice}>
          <p className={styles.setupMessage} role="status">{setupMessage}</p>
          {retrySetup && <button className="button button-outline" type="button" onClick={() => router.refresh()}>Try again</button>}
        </div>
      )}

      {accountDeleted && <p className={styles.authStatus} role="status">Your account and saved learning records have been deleted from Fieldnotes.</p>}
      {message && <p className={styles.authError} role="alert">{message}</p>}
      {pendingProvider && <p className={styles.pendingMessage} role="status">Redirecting to {pendingProvider === "google" ? "Google" : "GitHub"}. You’ll return to Fieldnotes when sign-in finishes.</p>}

      <p className={styles.accountNote}>First sign-in creates your account. No invitation is needed.</p>
      <Link className={styles.exploreButton} href="/roadmap">Continue exploring without signing in</Link>
      <p className={styles.privacyNote}>Fieldnotes uses basic account details to keep your records private. It does not request access to your Google Drive or GitHub repositories. Read the <Link href="/privacy">Privacy notice</Link> and <Link href="/terms">Terms</Link>.</p>
    </div>
  );
}
