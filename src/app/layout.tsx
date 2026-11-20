import type { Metadata } from "next";
import "@fontsource-variable/source-sans-3";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "DevOps Fieldnotes | Personal Learning Path",
    template: "%s | DevOps Fieldnotes",
  },
  description: "Public, self-paced DevOps lessons and practical labs with private, account-based progress notes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

