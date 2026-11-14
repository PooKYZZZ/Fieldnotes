"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenCheck, Compass, GraduationCap, LayoutDashboard, LibraryBig, Map, Menu, Rocket, X } from "lucide-react";

const navigation = [
  { label: "Dashboard", shortLabel: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Learning roadmap", shortLabel: "Roadmap", href: "/roadmap", icon: Map },
  { label: "Activities", shortLabel: "Activities", href: "/activities", icon: Activity },
  { label: "Projects", shortLabel: "Projects", href: "/projects", icon: Rocket },
  { label: "Progress notebook", shortLabel: "Progress", href: "/progress", icon: BookOpenCheck },
];
const resourcesNavigation = [
  { label: "Resource library", shortLabel: "Library", href: "/resources", icon: LibraryBig },
  { label: "Career & AI guide", shortLabel: "Guide", href: "/guide", icon: GraduationCap },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const update = () => setCompactViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (menuOpen && compactViewport) {
      sidebarRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    } else if (!menuOpen && wasMenuOpen.current && compactViewport) {
      menuButtonRef.current?.focus();
    }
    wasMenuOpen.current = menuOpen;
  }, [compactViewport, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function keepFocusInMobileNavigation(event: ReactKeyboardEvent<HTMLElement>) {
    if (!menuOpen || !compactViewport || event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
      .filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const renderLinks = (items: typeof navigation) => items.map(({ label, shortLabel, href, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    return <Link
      className="nav-link"
      href={href}
      key={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={() => setMenuOpen(false)}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{shortLabel}</span>
    </Link>;
  });

  return (
    <div className="app-shell">
      <aside
        ref={sidebarRef}
        className={`sidebar${menuOpen ? " open" : ""}`}
        aria-label="Main navigation"
        inert={compactViewport && !menuOpen}
        onKeyDown={keepFocusInMobileNavigation}
      >
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)} aria-label="DevOps Fieldnotes home">
          <span className="brand-mark"><Compass size={22} aria-hidden="true" /></span>
          <span className="brand-name">Fieldnotes</span>
        </Link>
        <p className="nav-group-title">Learn</p>
        <nav id="main-navigation" className="side-nav" aria-label="Learning pages">{renderLinks(navigation)}</nav>
        <p className="nav-group-title reference-nav-title">Reference</p>
        <nav className="side-nav" aria-label="Reference pages">{renderLinks(resourcesNavigation)}</nav>
      </aside>

      <button
        type="button"
        className={`backdrop${menuOpen ? " show" : ""}`}
        aria-label="Close navigation"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <div className="workspace">
        <header className="topbar" aria-label="Mobile navigation">
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="main-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
