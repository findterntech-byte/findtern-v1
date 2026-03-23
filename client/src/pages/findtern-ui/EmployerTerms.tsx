import React, { useEffect, useState } from 'react';

export default function EmployerTerms() {
  const [dbTerms, setDbTerms] = useState<{ title: string; bodyHtml: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch('/api/website/employer-terms', { credentials: 'include' });
        if (!res.ok) return;
        const json = (await res.json()) as any;
        const title = String(json?.terms?.title ?? '').trim();
        const bodyHtml = String(json?.terms?.bodyHtml ?? '').trim();
        if (!cancelled && title && bodyHtml) setDbTerms({ title, bodyHtml });
      } catch {
        // ignore
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dbTerms) {
    return (
      <div className="terms-v1">
        <section className="terms-v1__hero">
          <div className="container">
            <h1 className="terms-v1__title">{dbTerms.title}</h1>
          </div>
        </section>

        <section className="terms-v1__section">
          <div className="container">
            <article className="terms-v1__card">
              <div className="terms-v1__content" dangerouslySetInnerHTML={{ __html: dbTerms.bodyHtml }} />
            </article>
          </div>
        </section>
      </div>
    );
  }

  return <StaticTerms />;
}

function StaticTerms() {
  return (
    <div className="terms-v1">
      <section className="terms-v1__hero">
        <div className="container">
          <h1 className="terms-v1__title">Terms and Conditions</h1>
        </div>
      </section>

      <section className="terms-v1__section">
        <div className="container">
          <article className="terms-v1__card">
            <div className="terms-v1__content">
              <p>Terms content will appear here once configured by admin.</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
