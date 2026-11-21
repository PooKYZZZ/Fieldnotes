import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <section className="card card-pad" aria-labelledby="not-found-title">
      <p className="eyebrow"><Compass size={15} aria-hidden="true" /> Fieldnotes</p>
      <h1 id="not-found-title">Page not found</h1>
      <p className="page-description">That page may have moved or the address may be incomplete. Browse the learning roadmap to find a module and its lessons.</p>
      <Link className="button button-primary" href="/roadmap">Learning roadmap <ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
  );
}
