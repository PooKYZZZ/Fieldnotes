"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenCheck, BookOpenText, GraduationCap, House, LibraryBig, Map, PanelLeftClose, PanelLeftOpen, Rocket, X } from "lucide-react";
import { AccountNavigation } from "@/features/auth/account-navigation";
import { AuthSessionProvider } from "@/features/auth/auth-session-context";
import { ProgressListProvider } from "@/features/progress/progress-list-context";

const navigation = [
  { label: "Home", shortLabel: "Home", href: "/", icon: House },
  { label: "Learning roadmap", shortLabel: "Roadmap", href: "/roadmap", icon: Map },
  { label: "Activities", shortLabel: "Activities", href: "/activities", icon: Activity },
  { label: "Projects", shortLabel: "Projects", href: "/projects", icon: Rocket },
  { label: "Progress notebook", shortLabel: "Notebook", href: "/progress", icon: BookOpenCheck },
];
const resourcesNavigation = [
  { label: "Resource library", shortLabel: "Library", href: "/resources", icon: LibraryBig },
  { label: "Career & AI guide", shortLabel: "Guide", href: "/guide", icon: GraduationCap },
];
const sidebarPreference = "fieldnotes.desktopNavigation";

function visibleReadingPosition() {
  if (window.scrollY === 0) return null;
  const candidates = document.querySelectorAll<HTMLElement>(
    "#main-content :is(h1, h2, h3, p, li, pre, figure, textarea, select, summary)",
  );
  const line = Math.min(100, window.innerHeight / 4);
  let current: { element: HTMLElement; rect: DOMRect } | undefined;
  let next: { element: HTMLElement; rect: DOMRect } | undefined;
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || rect.bottom <= line || rect.top >= window.innerHeight) continue;
    if (rect.top <= line) {
      if (!current || current.rect.height > rect.height) current = { element, rect };
    } else if (!next || next.rect.top > rect.top) {
      next = { element, rect };
    }
  }
  const position = current ?? next;
  return position ? { element: position.element, top: position.rect.top } : null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const [desktopHidden, setDesktopHidden] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const desktopCloseRef = useRef<HTMLButtonElement>(null);
  const desktopChange = useRef<{ position: ReturnType<typeof visibleReadingPosition> } | null>(null);
  const wasMenuOpen = useRef(false);

  useEffect(() => {
    const restorePreference = requestAnimationFrame(() => {
      try {
        setDesktopHidden(localStorage.getItem(sidebarPreference) === "hidden");
      } catch {
        // The navigation still works when browser storage is restricted.
      }
    });
    const media = window.matchMedia("(max-width: 860px)");
    const update = () => {
      setCompactViewport(media.matches);
      if (!media.matches) setMenuOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(restorePreference);
      media.removeEventListener("change", update);
    };
  }, []);

  function setDesktopNavigation(hidden: boolean) {
    desktopChange.current = { position: visibleReadingPosition() };
    setDesktopHidden(hidden);
    try {
      localStorage.setItem(sidebarPreference, hidden ? "hidden" : "visible");
    } catch {
      // Keep the choice for the current visit.
    }
  }

  useLayoutEffect(() => {
    const change = desktopChange.current;
    if (!change) return;
    desktopChange.current = null;
    (desktopHidden ? menuButtonRef : desktopCloseRef).current?.focus({ preventScroll: true });
    const position = change.position;
    if (position?.element.isConnected) {
      window.scrollBy({ top: position.element.getBoundingClientRect().top - position.top, behavior: "instant" });
    }
  }, [desktopHidden]);

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
    const active = href === "/"
      ? pathname === "/"
      : href === "/roadmap"
        ? pathname === "/roadmap" || pathname.startsWith("/modules/")
        : pathname === href || pathname.startsWith(`${href}/`);
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
    <AuthSessionProvider><ProgressListProvider><div className="app-shell" data-desktop-nav-hidden={desktopHidden || undefined}>
      <aside
        id="main-navigation"
        ref={sidebarRef}
        className={`sidebar${menuOpen ? " open" : ""}`}
        aria-label="Main navigation"
        inert={compactViewport ? !menuOpen : desktopHidden}
        onKeyDown={keepFocusInMobileNavigation}
      >
        <button className="mobile-nav-close" type="button" aria-label="Close navigation drawer" onClick={() => setMenuOpen(false)}>
          <span>Close navigation drawer</span><X size={17} aria-hidden="true" />
        </button>
        <div className="sidebar-heading">
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark"><BookOpenText size={19} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="brand-name">Fieldnotes <span className="brand-subtitle">DevOps curriculum</span></span>
            <span className="sr-only">home</span>
          </Link>
          <button ref={desktopCloseRef} className="desktop-nav-close" type="button" aria-label="Close navigation" title="Close navigation" onClick={() => setDesktopNavigation(true)}>
            <PanelLeftClose size={19} aria-hidden="true" />
          </button>
        </div>
        <p className="nav-group-title">Workspace</p>
        <nav className="side-nav" aria-label="Learning pages">{renderLinks(navigation)}</nav>
        <p className="nav-group-title reference-nav-title">Reference</p>
        <nav className="side-nav" aria-label="Reference pages">{renderLinks(resourcesNavigation)}</nav>
        <nav className="side-nav account-nav" aria-label="Account pages"><AccountNavigation onNavigate={() => setMenuOpen(false)} /></nav>
      </aside>

      <button
        type="button"
        className={`backdrop${menuOpen ? " show" : ""}`}
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />

      <div className="workspace">
        <header className="topbar" aria-label="Navigation controls" inert={compactViewport && menuOpen}>
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation"
            title="Open navigation"
            aria-controls="main-navigation"
            aria-expanded={compactViewport ? menuOpen : !desktopHidden}
            onClick={() => compactViewport ? setMenuOpen(true) : setDesktopNavigation(false)}
          >
            <PanelLeftOpen size={19} aria-hidden="true" />
          </button>
          <Link className="mobile-brand" href="/" onClick={() => setMenuOpen(false)}>
            <BookOpenText size={18} strokeWidth={1.7} aria-hidden="true" /> Fieldnotes
          </Link>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1} inert={compactViewport && menuOpen}>{children}</main>
        <footer className="site-legal-footer" inert={compactViewport && menuOpen}>
          <span>Public learning materials · private progress records</span>
          <nav aria-label="Legal information">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </footer>
      </div>
    </div></ProgressListProvider></AuthSessionProvider>
  );
}
