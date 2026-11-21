import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What DevOps Fieldnotes stores when you browse or sign in.",
};

export default function PrivacyPage() {
  return <>
    <header className="page-header">
      <div>
        <p className="eyebrow">Account and learning records</p>
        <h1>Privacy notice</h1>
        <p className="page-description">Last updated November 20, 2026. Lessons are public; account progress is private to the signed-in learner.</p>
      </div>
    </header>
    <article className="article-copy legal-document">
      <h2>What Fieldnotes stores</h2>
      <p>If you browse without signing in, Fieldnotes does not create a learner account or save progress for you. If you sign in with Google or GitHub, Fieldnotes receives your provider account identifier, name, email address, email-verification state, and profile image when the provider supplies it. Sign-in requests only basic identity access; Fieldnotes does not request access to your Google Drive or GitHub repositories.</p>
      <p>Fieldnotes stores account and sign-in records, session expiry and security metadata, and rate-limit counters. A session can include your browser user-agent and, on the public Cloudflare Tunnel route, the visitor IP address provided by Cloudflare. These fields support sign-in, session management, and abuse prevention.</p>
      <p>When signed in, your notebook may contain lesson and activity status, confidence selections, notes, evidence, task observations, project checkpoint notes, and repository links that you choose to enter. Do not put passwords, API keys, private personal information, or confidential work data in learning records. Notes and evidence are stored as plain text in the host&apos;s SQLite database; OAuth tokens are encrypted at rest using the Fieldnotes authentication secret.</p>

      <h2>How the information is used</h2>
      <p>Fieldnotes uses account details to authenticate you, keep your saved work separate from other learners, restore your records, and protect the service from automated sign-in abuse. It does not use account activity to grade you, advertise to you, or delete your account after inactivity.</p>
      <p>The service is operated on a self-hosted computer. The operator and anyone with access to that host or its backups may be able to access the SQLite database. When you use <code>learn.cybertracesystems.com</code>, network traffic is routed through Cloudflare Tunnel; Cloudflare&apos;s own handling of network traffic is described in its <a href="https://www.cloudflare.com/privacypolicy/">Privacy Policy</a>.</p>

      <h2>Retention and deletion</h2>
      <p>Your account and learning records remain in the active Fieldnotes database until you delete your account or the operator removes the database. Authentication sessions expire after up to 30 days and are renewed during regular use. Fieldnotes does not automatically remove accounts or progress because of inactivity.</p>
      <p>You can request permanent deletion from the account page. Deleting an account removes its Fieldnotes profile, linked sign-in records, sessions, and saved progress from the active database. Deletion does not remove JSON exports you downloaded or copies already present in host or operator backups; those copies must be deleted separately. Deleting a Fieldnotes account also does not delete your Google or GitHub account. To revoke the provider-side authorization, remove Fieldnotes from that provider&apos;s account security settings.</p>

      <h2>Providers and changes</h2>
      <p>Google and GitHub process sign-in according to their own privacy terms. Fieldnotes currently has no advertising, analytics, email delivery, or third-party learning trackers. If that changes, this notice should be updated before the new data use begins.</p>
      <p>For a privacy or account question, contact the operator using the support email shown on the Google consent screen or the channel where you received the Fieldnotes link. You can continue reading the <Link href="/roadmap">public curriculum</Link> without creating an account.</p>
    </article>
  </>;
}
