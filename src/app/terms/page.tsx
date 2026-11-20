import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Basic terms for using the DevOps Fieldnotes learning materials and account features.",
};

export default function TermsPage() {
  return <>
    <header className="page-header">
      <div>
        <p className="eyebrow">Using Fieldnotes</p>
        <h1>Terms of use</h1>
        <p className="page-description">Last updated November 20, 2026. These plain-language terms explain the intended use of this learning workspace.</p>
      </div>
    </header>
    <article className="article-copy legal-document">
      <h2>Learning materials</h2>
      <p>Fieldnotes provides self-paced DevOps lessons, activities, troubleshooting scenarios, and project guides for education. Progress and completion are self-reported; they do not certify skills, verify work performed outside Fieldnotes, or guarantee a particular result.</p>
      <p>Examples and commands are provided for learning. Check each command and run it only in an environment you own or are authorized to use. Use disposable lab systems for exercises that could change files, services, infrastructure, or cloud resources. You are responsible for understanding costs and the effects of actions you choose to take.</p>

      <h2>Your account and records</h2>
      <p>Creating an account is optional. You may browse public lessons without signing in. When signed in, keep your account credentials and device secure, and do not use Fieldnotes to access another learner&apos;s account or records.</p>
      <p>Do not save secrets, credentials, sensitive personal information, or confidential work material in notes, evidence, or project links. The service operator runs the host and can access its database and backups. Use the account page to delete your account; downloaded exports and existing backups are outside that deletion.</p>

      <h2>Responsible use and availability</h2>
      <p>Do not use Fieldnotes to disrupt the service, attempt unauthorized access, or submit harmful content. The operator may restrict access to protect the service or its users. The service may be changed or unavailable while it is maintained.</p>
      <p>Use the materials at your own discretion. Fieldnotes is not a substitute for current vendor documentation, professional security review, production change controls, or legal advice. Verify current product behavior and safety requirements before applying a lesson to a real system.</p>

      <h2>Questions</h2>
      <p>For questions about these terms, contact the operator using the support email shown on the Google consent screen or the channel where you received the Fieldnotes link. The <Link href="/privacy">Privacy notice</Link> explains how account information and saved work are handled.</p>
    </article>
  </>;
}
