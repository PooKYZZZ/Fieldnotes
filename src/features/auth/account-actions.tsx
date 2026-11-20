"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, MonitorSmartphone, Trash2 } from "lucide-react";
import { authClient } from "@/features/auth/auth-client";
import styles from "@/features/auth/auth.module.css";

export function AccountActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [reauthenticationRequired, setReauthenticationRequired] = useState(false);

  async function signOutEverywhere() {
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) throw new Error("Could not end the other sessions.");
      setMessage("Other signed-in devices have been signed out.");
    } catch {
      setError(true);
      setMessage("Other sessions could not be ended. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not sign out.");
      router.replace("/");
      router.refresh();
    } catch {
      setError(true);
      setMessage("Sign-out could not be completed. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmation !== "DELETE") return;
    setBusy(true);
    setError(false);
    setMessage("");
    setReauthenticationRequired(false);
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        if (result.error.code === "SESSION_EXPIRED") {
          setReauthenticationRequired(true);
          throw new Error("For your security, sign in again before deleting your account.");
        }
        throw new Error("The account could not be deleted.");
      }
      router.replace("/sign-in?accountDeleted=1");
      router.refresh();
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "The account could not be deleted. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function signInAgain() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not safely restart sign-in. Try signing out, then sign in again.");
      router.replace("/sign-in?returnTo=%2Faccount");
      router.refresh();
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Could not restart sign-in. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.accountActions}>
      <button className="button button-outline" type="button" disabled={busy} onClick={() => void signOutEverywhere()}>
        <MonitorSmartphone size={16} aria-hidden="true" /> Sign out other devices
      </button>
      <button className="button button-primary" type="button" disabled={busy} onClick={() => void signOut()}>
        <LogOut size={16} aria-hidden="true" /> Sign out
      </button>
      {message && reauthenticationRequired && <button className="button button-outline" type="button" disabled={busy} onClick={() => void signInAgain()}>
        Sign in again
      </button>}
      {message && <p className={error ? styles.authError : styles.authStatus} role={error ? "alert" : "status"}>{message}</p>}

      <section className={styles.dangerZone} aria-labelledby="delete-account-title">
        <h3 id="delete-account-title"><AlertTriangle size={16} aria-hidden="true" /> Delete account</h3>
        <p>This permanently removes your Fieldnotes account, saved learning records, linked sign-in records, and sessions. It does not remove files you exported or copies in backups.</p>
        {!deleteOpen ? (
          <button className={`button ${styles.deleteButton}`} type="button" disabled={busy} onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} aria-hidden="true" /> Delete account and saved work
          </button>
        ) : (
          <div className={styles.deleteConfirmation}>
            <label htmlFor="delete-account-confirmation">Type DELETE to confirm</label>
            <input
              id="delete-account-confirmation"
              autoComplete="off"
              autoCapitalize="characters"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              aria-describedby="delete-account-help"
            />
            <p id="delete-account-help">You will need to sign in again first if your last sign-in was more than 10 minutes ago.</p>
            <div>
              <button className={`button ${styles.deleteButtonConfirm}`} type="button" disabled={busy || deleteConfirmation !== "DELETE"} onClick={() => void deleteAccount()}>
                {busy ? "Deleting account…" : "Permanently delete account"}
              </button>
              <button className="button button-outline" type="button" disabled={busy} onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmation("");
                setMessage("");
                setError(false);
                setReauthenticationRequired(false);
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
