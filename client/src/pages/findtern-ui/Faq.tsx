import React, { useEffect, useId, useMemo, useState } from 'react';
import { FaSearch, FaChevronDown } from 'react-icons/fa';

export default function Faq() {
  const baseId = useId();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  type CmsFaqItem = {
    id: string;
    category: string;
    question: string;
    answer: string;
    sortOrder: number;
    isActive: boolean;
  };

  const [cmsItems, setCmsItems] = useState<CmsFaqItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website/faq', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCmsItems(Array.isArray(json?.items) ? json.items : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const faqs = useMemo(() => {
    if (cmsItems !== null) {
      return (cmsItems ?? [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((f) => ({ id: f.id, category: f.category, q: f.question, a: f.answer }));
    }
    return [
      {
        id: 'getting-started',
        category: 'Getting Started',
        q: 'What is Findtern?',
        a: 'Findtern helps companies hire pre-vetted interns faster using structured screening and matching.'
      },
      {
        id: 'pricing',
        category: 'Pricing',
        q: 'Is Findtern free to use?',
        a: 'We offer multiple plans. You can explore pricing on the Pricing page and choose what fits your needs.'
      },
      {
        id: 'hiring-flow',
        category: 'Hiring',
        q: 'How does the hiring process work?',
        a: 'You browse or receive matched intern profiles, review evaluations, shortlist candidates, and proceed with interviews and selection.'
      },
      {
        id: 'quality',
        category: 'Hiring',
        q: 'How are interns screened?',
        a: 'Profiles are assessed through aptitude/skill checks and structured evaluation so you can shortlist with confidence.'
      },
      {
        id: 'support',
        category: 'Support',
        q: 'How can I contact support?',
        a: 'You can reach us at admin@findtern.in via the Contact page.'
      },
      {
        id: 'privacy',
        category: 'Account & Privacy',
        q: 'How is my data handled?',
        a: 'We follow reasonable security practices to protect data. If you have any concerns, email us and we’ll help.'
      }
    ];
  }, [cmsItems]);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    faqs.forEach((f) => set.add(f.category));
    return Array.from(set);
  }, [faqs]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const inCategory = activeCategory === 'All' || f.category === activeCategory;
      if (!inCategory) return false;
      if (!normalizedQuery) return true;
      return (
        f.q.toLowerCase().includes(normalizedQuery) ||
        f.a.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [faqs, activeCategory, normalizedQuery]);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="faq-v1">
      <section className="faq-v1__hero">
        <div className="container">
          <h1 className="faq-v1__title">FAQ</h1>
          <p className="faq-v1__subtitle">Quick answers to the most common questions.</p>
        </div>
      </section>

      <section className="faq-v1__section">
        <div className="container">
          <div className="faq-v1__card">
            <div className="faq-v1__top">
              <div className="faq-v1__search">
                <FaSearch aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions..."
                  aria-label="Search FAQs"
                />
              </div>

              <div className="faq-v1__chips" role="tablist" aria-label="FAQ categories">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`faq-v1__chip ${c === activeCategory ? 'active' : ''}`}
                    onClick={() => setActiveCategory(c)}
                    role="tab"
                    aria-selected={c === activeCategory}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="faq-v1__list" role="region" aria-label="Frequently asked questions">
              {filtered.length === 0 ? (
                <div className="faq-v1__empty">
                  No results. Try a different search or category.
                </div>
              ) : (
                filtered.map((item) => {
                  const qId = `${baseId}-${item.id}-q`;
                  const aId = `${baseId}-${item.id}-a`;
                  const isOpen = openId === item.id;

                  return (
                    <div key={item.id} className={`faq-v1__item ${isOpen ? 'open' : ''}`}>
                      <button
                        id={qId}
                        type="button"
                        className="faq-v1__question"
                        onClick={() => toggle(item.id)}
                        aria-expanded={isOpen}
                        aria-controls={aId}
                      >
                        <span className="faq-v1__qText">{item.q}</span>
                        <span className="faq-v1__icon" aria-hidden="true">
                          <FaChevronDown aria-hidden="true" />
                        </span>
                      </button>

                      <div
                        id={aId}
                        className="faq-v1__answer"
                        role="region"
                        aria-labelledby={qId}
                        hidden={!isOpen}
                      >
                        <div className="faq-v1__answerInner">{item.a}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="faq-v1__footer">
              <div className="faq-v1__footerText">Still need help?</div>
              <a className="faq-v1__footerLink" href="mailto:admin@findtern.in">admin@findtern.in</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
