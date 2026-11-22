"use client";

export function ProgressAccountChangedNotice() {
  return <div className="progress-load-error" role="alert">
    <h2>The signed-in account changed</h2>
    <p>Private saved records are hidden. Reload this page to reopen it under the current account.</p>
    <button className="button button-outline" type="button" onClick={() => window.location.reload()}>Reload this page</button>
  </div>;
}
