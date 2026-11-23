import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title">
      <header className="page-header">
        <div>
          <h1 id="not-found-title">Page not found</h1>
          <p className="page-description">That page may have moved or the address may be incomplete. Browse the roadmap to find a module and its lessons.</p>
        </div>
      </header>
      <Link className="button button-primary" href="/roadmap">Learning roadmap <ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
  );
}
