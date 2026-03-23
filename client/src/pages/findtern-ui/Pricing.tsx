import React, { useEffect, useMemo, useState } from 'react';
import useReveal from '../../hooks/useReveal.ts';
import { FaArrowLeft, FaArrowRight, FaStar } from 'react-icons/fa';
import Coffe from '@assets/coffe.mp4'
import ContactCTA from '@/components/ui/ContactCTA.tsx';

export function PricingSection() {
  type CmsPlan = {
    id: string;
    name?: string;
    displayName?: string;
    slug?: string;
    priceText?: string | null;
    currency?: string | null;
    priceHourlyMinor?: number | null;
    perHireChargeMinor?: number | null;
    internshipDuration?: string | null;
    gstApplicable?: boolean | null;
    subtitle?: string | null;
    features?: string[];
    sortOrder?: number;
    isActive?: boolean;
  };

  const [cmsPlans, setCmsPlans] = useState<CmsPlan[] | null>(null);
  const [resolvedIsIndia, setResolvedIsIndia] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let countryParam = '';
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          const tzLower = tz.toLowerCase();
          const lang = navigator.language || '';
          const langLower = lang.toLowerCase();
          const looksLikeIndiaLang = langLower.endsWith('-in') || langLower.includes('-in');
          const looksLikeIndiaTz = tzLower.includes('kolkata') || tzLower.includes('calcutta');
          const looksLikeIndiaOffset = new Date().getTimezoneOffset() === -330;
          if (looksLikeIndiaTz || looksLikeIndiaLang || looksLikeIndiaOffset) {
            countryParam = 'IN';
          }
        } catch {
          // ignore
        }

        const plansUrl = `/api/pricing${countryParam ? `?country=${encodeURIComponent(countryParam)}` : ''}`;
        const plansRes = await fetch(plansUrl, { credentials: 'include' });

        if (!cancelled && plansRes.ok) {
          const j = await plansRes.json();
          const nextPlans = Array.isArray(j?.items) ? j.items : [];
          setCmsPlans(nextPlans);

          const hintSaysIndia = String(countryParam || '').toUpperCase() === 'IN';
          setResolvedIsIndia(hintSaysIndia);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isIndia = resolvedIsIndia;
  const expectedCurrency = isIndia ? 'INR' : 'USD';

  const planBySlug = useMemo(() => {
    const map: Record<string, CmsPlan> = {};
    for (const p of cmsPlans ?? []) {
      const key = String(p?.slug ?? p?.name ?? '').trim().toLowerCase();
      if (!key) continue;
      map[key] = p;
    }
    return map;
  }, [cmsPlans]);

  const espresso = planBySlug['espresso'];
  const cappuccino = planBySlug['cappuccino'];
  const latte = planBySlug['latte'];

  const formatCurrency = (minor: number, currency: string) => {
    const cur = String(currency || 'USD').toUpperCase();
    const major = Number(minor || 0) / 100;
    const hasDecimals = Math.round(major * 100) % 100 !== 0;
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(major);

    if (cur === 'USD') return `$${formatted}`;
    if (cur === 'INR') return `INR ${formatted}`;
    return `${cur} ${formatted}`;
  };

  const priceText = (p: CmsPlan | undefined, fallback: string) => {
    if (!p) return fallback;
    const minor = Number(p.priceHourlyMinor ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) return 'Free';
    const cur = String(p.currency || '').toUpperCase();
    if (cur && cur !== expectedCurrency) return fallback;
    return `${formatCurrency(minor, cur || expectedCurrency)}/hr`;
  };

  const perHireText = (p: CmsPlan | undefined, fallback: string) => {
    if (!p) return fallback;
    const minor = Number(p.perHireChargeMinor ?? 0);
    const cur = String(p.currency || '').toUpperCase();
    if (cur && cur !== expectedCurrency) return fallback;
    if (!Number.isFinite(minor) || minor <= 0) return formatCurrency(0, cur || expectedCurrency);
    return `${formatCurrency(minor, cur || expectedCurrency)} per hire`;
  };

  const getFeature = (p: CmsPlan | undefined, idx: number, fallback: string) => {
    const arr = Array.isArray(p?.features) ? p?.features ?? [] : [];
    const v = typeof arr[idx] === 'string' ? String(arr[idx]) : '';
    return v.trim() ? v : fallback;
  };

  return (
    <section className="pricing pricing-v3">
      <div className="pricing-v3__media" aria-hidden="true">
        <video
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onError={(e) => console.error('pricing video error', e)}
        >
          <source src={Coffe} type="video/mp4" />
          Your browser does not support HTML video.
        </video>
      </div>
      <div className="pricing-v3__bg" aria-hidden="true"></div>
      <div className="container pricing-v3__inner">
        <h2 className="heading--smile">Hire an Intern for the Price of a Coffee!</h2>
        <div className="pricing-v3__subtitle">Affordable. Flexible. Transparent.</div>
        <div className="pricing-v3__caption">Findtern makes hiring interns easy and budget-friendly with three simple plans.</div>

        <div className="pricing-v3__card tilt-3d">
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>{isIndia ? 'India (INR)' : 'Outside India (USD)'}</div>
          <div className="pricing-v3__tableWrap">
            <table className="pricing-v3__table">
              <thead>
                <tr>
                  <th className="pricing-v3__head pricing-v3__head--left">Plan</th>
                  <th className="pricing-v3__head">
                    Espresso
                    <br />
                    <span>({priceText(espresso, 'Free')})</span>
                  </th>
                  <th className="pricing-v3__head">
                    Cappuccino
                    <br />
                    <span>({priceText(cappuccino, isIndia ? 'INR 100/hr' : '$1/hr')})</span>
                  </th>
                  <th className="pricing-v3__head">
                    Latte
                    <br />
                    <span>({priceText(latte, isIndia ? 'INR 200/hr' : '$2/hr')})</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pricing-v3__rowTitle">Who&apos;s it for?</td>
                  <td>{getFeature(espresso, 0, 'Budget-friendly hiring')}</td>
                  <td>{getFeature(cappuccino, 0, 'Skilled interns')}</td>
                  <td>{getFeature(latte, 0, 'Top-rated talent')}</td>
                </tr>
                <tr>
                  <td className="pricing-v3__rowTitle">Findtern Score</td>
                  <td>{getFeature(espresso, 1, '⭐ Less than 6/10')}</td>
                  <td>{getFeature(cappuccino, 1, '⭐ 6-8/10')}</td>
                  <td>{getFeature(latte, 1, '⭐ 8+/10 (Top Rated)')}</td>
                </tr>
                <tr>
                  <td className="pricing-v3__rowTitle">Per Hiring Charge</td>
                  <td>{perHireText(espresso, isIndia ? 'INR 5,000 per hire' : '$50 per hire')}</td>
                  <td>{perHireText(cappuccino, isIndia ? 'INR 0' : '$0')}</td>
                  <td>{perHireText(latte, isIndia ? 'INR 0' : '$0')}</td>
                </tr>
                <tr>
                  <td className="pricing-v3__rowTitle">Price</td>
                  <td>{priceText(espresso, 'Free')}</td>
                  <td>{priceText(cappuccino, isIndia ? 'INR 100/hr' : '$1/hr')}</td>
                  <td>{priceText(latte, isIndia ? 'INR 200/hr' : '$2/hr')}</td>
                </tr>
                <tr>
                  <td className="pricing-v3__rowTitle">Internship Duration</td>
                  <td>{String(espresso?.internshipDuration ?? 'Up to 60 days')}</td>
                  <td>{String(cappuccino?.internshipDuration ?? '1-6 months')}</td>
                  <td>{String(latte?.internshipDuration ?? '1-6 months')}</td>
                </tr>
                <tr>
                  <td className="pricing-v3__rowTitle">What You Get</td>
                  <td>{getFeature(espresso, 2, 'Access to basic talent')}</td>
                  <td>{getFeature(cappuccino, 2, 'Access to medium skilled talent')}</td>
                  <td>{getFeature(latte, 2, 'Top-rated talent')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {isIndia ? <div className="pricing-v3__footnote">*Price includes GST</div> : null}
        </div>
      </div>
    </section>
  );
}

export default function Pricing() {
  useReveal();

  type CmsPlan = {
    id: string;
    name?: string;
    displayName?: string;
    slug?: string;
    priceText?: string | null;
    currency?: string | null;
    priceHourlyMinor?: number | null;
    perHireChargeMinor?: number | null;
    internshipDuration?: string | null;
    gstApplicable?: boolean | null;
    subtitle?: string | null;
    features?: string[];
    sortOrder?: number;
    isActive?: boolean;
  };

  type CmsHappyFace = {
    id: string;
    quote: string;
    title: string;
    name: string;
    company: string;
    avatarUrl: string | null;
    sortOrder: number;
    isActive: boolean;
  };

  type Testimonial = {
    quote: string;
    title: string;
    name: string;
    company: string;
    avatar: string;
  };

  const [cmsPlans, setCmsPlans] = useState<CmsPlan[] | null>(null);
  const [cmsFaces, setCmsFaces] = useState<CmsHappyFace[] | null>(null);
  const [countryHint, setCountryHint] = useState<string>("");
  const [resolvedIsIndia, setResolvedIsIndia] = useState<boolean>(false);

  const fallbackTestimonials: Testimonial[] = [];

  const pricingTestimonials = useMemo<Testimonial[]>(() => {
    if (cmsFaces && cmsFaces.length) {
      return cmsFaces.map((t) => ({
        quote: t.quote,
        title: t.title,
        name: t.name,
        company: t.company,
        avatar:
          t.avatarUrl ||
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      }));
    }
    return fallbackTestimonials;
  }, [cmsFaces]);

  const ensureMinTestimonials = (list: Testimonial[], min: number) => {
    const src = Array.isArray(list) ? list.filter(Boolean) : [];
    const out = [...src];
    let i = 0;
    while (out.length < min && i < fallbackTestimonials.length) {
      out.push(fallbackTestimonials[i]);
      i += 1;
    }
    i = 0;
    while (out.length < min && out.length > 0) {
      out.push(out[i % out.length]);
      i += 1;
    }
    return out;
  };

  const resolvedTestimonials = useMemo<Testimonial[]>(() => ensureMinTestimonials(pricingTestimonials, 5), [pricingTestimonials]);

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const current: Testimonial | undefined = resolvedTestimonials[activeTestimonial];

  useEffect(() => {
    if (resolvedTestimonials.length === 0) return;
    setActiveTestimonial((i) => i % resolvedTestimonials.length);
  }, [resolvedTestimonials.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // try to detect India from locale / timezone as a quick client-side hint
        let countryParam = '';
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          const lang = navigator.language || '';
          const langLower = lang.toLowerCase();
          const looksLikeIndiaLang = langLower.endsWith('-in') || langLower.includes('-in');
          const tzLower = tz.toLowerCase();
          const looksLikeIndiaTz = tzLower.includes('kolkata') || tzLower.includes('calcutta');
          const looksLikeIndiaOffset = new Date().getTimezoneOffset() === -330;
          if (looksLikeIndiaTz || looksLikeIndiaLang || looksLikeIndiaOffset) {
            countryParam = 'IN';
          }
        } catch {
          // ignore
        }

        if (!cancelled) setCountryHint(countryParam);

        const plansUrl = `/api/pricing${countryParam ? `?country=${encodeURIComponent(countryParam)}` : ''}`;

        const [plansRes, facesRes] = await Promise.all([
          fetch(plansUrl, { credentials: 'include' }),
          fetch('/api/website/faces', { credentials: 'include' }),
        ]);

        if (!cancelled && plansRes.ok) {
          const j = await plansRes.json();
          const nextPlans = Array.isArray(j?.items) ? j.items : [];
          setCmsPlans(nextPlans);

          const hintSaysIndia = String(countryParam || '').toUpperCase() === 'IN';
          setResolvedIsIndia(hintSaysIndia);
        }
        if (!cancelled && facesRes.ok) {
          const j = await facesRes.json();
          setCmsFaces(Array.isArray(j?.items) ? j.items : []);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isIndia = resolvedIsIndia;
  const expectedCurrency = isIndia ? 'INR' : 'USD';

  const planBySlug = useMemo(() => {
    const map: Record<string, CmsPlan> = {};
    for (const p of cmsPlans ?? []) {
      const key = String(p?.slug ?? p?.name ?? '').trim().toLowerCase();
      if (!key) continue;
      map[key] = p;
    }
    return map;
  }, [cmsPlans]);

  const espresso = planBySlug['espresso'];
  const cappuccino = planBySlug['cappuccino'];
  const latte = planBySlug['latte'];

  const formatCurrency = (minor: number, currency: string) => {
    const cur = String(currency || 'USD').toUpperCase();
    const major = Number(minor || 0) / 100;
    const hasDecimals = Math.round(major * 100) % 100 !== 0;
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(major);

    if (cur === 'USD') return `$${formatted}`;
    if (cur === 'INR') return `INR ${formatted}`;
    return `${cur} ${formatted}`;
  };

  const priceText = (p: CmsPlan | undefined, fallback: string) => {
    if (!p) return fallback;
    const minor = Number(p.priceHourlyMinor ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) return 'Free';
    const cur = String(p.currency || '').toUpperCase();
    if (cur && cur !== expectedCurrency) return fallback;
    return `${formatCurrency(minor, cur || expectedCurrency)}/hr`;
  };

  const perHireText = (p: CmsPlan | undefined, fallback: string) => {
    if (!p) return fallback;
    const minor = Number(p.perHireChargeMinor ?? 0);
    const cur = String(p.currency || '').toUpperCase();
    if (cur && cur !== expectedCurrency) return fallback;
    if (!Number.isFinite(minor) || minor <= 0) return formatCurrency(0, cur || expectedCurrency);
    return `${formatCurrency(minor, cur || expectedCurrency)} per hire`;
  };

  const getFeature = (p: CmsPlan | undefined, idx: number, fallback: string) => {
    const arr = Array.isArray(p?.features) ? p?.features ?? [] : [];
    const v = typeof arr[idx] === 'string' ? String(arr[idx]) : '';
    return v.trim() ? v : fallback;
  };

  const getTestimonialIndex = (i: number) => {
    const len = resolvedTestimonials.length;
    if (len === 0) return 0;
    return (i + len) % len;
  };

  const prevTestimonial = () => {
    setActiveTestimonial((i) => (i - 1 + resolvedTestimonials.length) % resolvedTestimonials.length);
  };

  const nextTestimonial = () => {
    setActiveTestimonial((i) => (i + 1) % resolvedTestimonials.length);
  };

  useEffect(() => {
    if (resolvedTestimonials.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveTestimonial((i) => (i + 1) % resolvedTestimonials.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [resolvedTestimonials.length]);

  return (
    <>
      <section className="pricing pricing-v3">
        <div className="pricing-v3__media" aria-hidden="true">
          <video muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} onError={(e) => console.error('pricing video error', e)}>
            <source src={Coffe} type="video/mp4" />
            Your browser does not support HTML video.
          </video>
        </div>
        <div className="pricing-v3__bg" aria-hidden="true"></div>
        <div className="container pricing-v3__inner">
          <h2>Hire an Intern for the Price of a Coffee!</h2>
          <div className="pricing-v3__subtitle">Affordable. Flexible. Transparent.</div>
          <div className="pricing-v3__caption">Findtern makes hiring interns easy and budget-friendly with three simple plans.</div>

          <div className="pricing-v3__card tilt-3d">
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>
              {isIndia ? 'India (INR)' : 'Outside India (USD)'}
            </div>
            <div className="pricing-v3__tableWrap">
              <table className="pricing-v3__table">
                <thead>
                  <tr>
                    <th className="pricing-v3__head pricing-v3__head--left">Plan</th>
                    <th className="pricing-v3__head">
                      Espresso
                      <br />
                      <span>({priceText(espresso, 'Free')})</span>
                    </th>
                    <th className="pricing-v3__head">
                      Cappuccino
                      <br />
                      <span>({priceText(cappuccino, isIndia ? 'INR 100/hr' : '$5/hr')})</span>
                    </th>
                    <th className="pricing-v3__head">
                      Latte
                      <br />
                      <span>({priceText(latte, isIndia ? 'INR 200/hr' : '$10/hr')})</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pricing-v3__rowTitle">Who&apos;s it for?</td>
                    <td>{getFeature(espresso, 0, 'Budget-friendly hiring')}</td>
                    <td>{getFeature(cappuccino, 0, 'Skilled interns')}</td>
                    <td>{getFeature(latte, 0, 'Top-rated talent')}</td>
                  </tr>
                  <tr>
                    <td className="pricing-v3__rowTitle">Findtern Score</td>
                    <td>{getFeature(espresso, 1, '⭐ Less than 6/10')}</td>
                    <td>{getFeature(cappuccino, 1, '⭐ 6-8/10')}</td>
                    <td>{getFeature(latte, 1, '⭐ 8+/10 (Top Rated)')}</td>
                  </tr>
                  <tr>
                    <td className="pricing-v3__rowTitle">Per Hiring Charge</td>
                    <td>{perHireText(espresso, isIndia ? 'INR 5,000 per hire' : '$50 per hire')}</td>
                    <td>{perHireText(cappuccino, isIndia ? 'INR 0' : '$0')}</td>
                    <td>{perHireText(latte, isIndia ? 'INR 0' : '$0')}</td>
                  </tr>
                  <tr>
                    <td className="pricing-v3__rowTitle">Price</td>
                    <td>{priceText(espresso, 'Free')}</td>
                    <td>{priceText(cappuccino, isIndia ? 'INR 100/hr' : '$5/hr')}</td>
                    <td>{priceText(latte, isIndia ? 'INR 200/hr' : '$10/hr')}</td>
                  </tr>
                  <tr>
                    <td className="pricing-v3__rowTitle">Internship Duration</td>
                    <td>{String(espresso?.internshipDuration ?? 'Up to 60 days')}</td>
                    <td>{String(cappuccino?.internshipDuration ?? '1-6 months')}</td>
                    <td>{String(latte?.internshipDuration ?? '1-6 months')}</td>
                  </tr>
                  <tr>
                    <td className="pricing-v3__rowTitle">What You Get</td>
                    <td>{getFeature(espresso, 2, 'Access to basic talent')}</td>
                    <td>{getFeature(cappuccino, 2, 'Access to medium skilled talent')}</td>
                    <td>{getFeature(latte, 2, 'Top-rated talent')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {isIndia ? <div className="pricing-v3__footnote">*Price includes GST</div> : null}
          </div>
        </div>
      </section>

      <ContactCTA />

      <section className="testimonials happy-faces-v3 reveal reveal--up">
        <div className="container">
          <h2 className="">Happy <span className="heading--smile">Faces</span></h2>
          <div className="happy-faces-v3__wrap">
            <button type="button" className="happy-faces-v3__nav happy-faces-v3__nav--left" onClick={prevTestimonial} aria-label="Previous testimonial">
              <FaArrowLeft aria-hidden="true" />
            </button>

            <div className="happy-faces-v3__stage" role="group" aria-label="Testimonials">
              {(() => {
                const len = resolvedTestimonials.length;
                if (len === 0) return null;

                const prev = resolvedTestimonials[getTestimonialIndex(activeTestimonial - 1)];
                const next = resolvedTestimonials[getTestimonialIndex(activeTestimonial + 1)];

                const items = len === 1
                  ? [{ key: 'current', t: current, cls: 'happy-faces-v3__item--current', ariaHidden: false }]
                  : [
                    { key: 'prev', t: prev, cls: 'happy-faces-v3__item--prev', ariaHidden: true },
                    { key: 'current', t: current, cls: 'happy-faces-v3__item--current', ariaHidden: false },
                    { key: 'next', t: next, cls: 'happy-faces-v3__item--next', ariaHidden: true },
                  ];

                return items.map((it) => (
                  <div key={it.key} className={`happy-faces-v3__item ${it.cls}`} aria-hidden={it.ariaHidden ? 'true' : 'false'}>
                    <div className="happy-faces-v3__card" role="group" aria-label="Testimonial">
                      <div className="happy-faces-v3__avatar">
                        <img src={it.t.avatar} alt="Reviewer" loading="lazy" />
                      </div>
                      <div className="happy-faces-v3__stars" aria-label="5 star rating">
                        <FaStar aria-hidden="true" />
                        <FaStar aria-hidden="true" />
                        <FaStar aria-hidden="true" />
                        <FaStar aria-hidden="true" />
                        <FaStar aria-hidden="true" />
                      </div>
                      <p className="happy-faces-v3__quote">{it.t.quote}</p>
                      <div className="happy-faces-v3__title">{it.t.title}</div>
                      <div className="happy-faces-v3__name">{it.t.name}</div>
                      <div className="happy-faces-v3__company">{it.t.company}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <button type="button" className="happy-faces-v3__nav happy-faces-v3__nav--right" onClick={nextTestimonial} aria-label="Next testimonial">
              <FaArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
