import "./coming-soon.css";

/* Stands in for the pages the header links to but that do not exist yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="shell coming-soon">
      <h1 className="coming-soon__title">{title}</h1>
      <p className="coming-soon__copy">
        This page has not been built yet. The landing page is the only one with
        real content so far.
      </p>
    </section>
  );
}
