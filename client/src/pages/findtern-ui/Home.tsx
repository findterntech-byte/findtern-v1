import React, { useEffect, useMemo, useState } from 'react';
import useReveal from '../../hooks/useReveal.ts';
import heroVideo from '@assets/banner.mp4';
import { FaPenNib, FaChartLine, FaBullhorn, FaWallet, FaDesktop, FaCode, FaBriefcase, FaUsers, FaCircle, FaCheckCircle, FaArrowLeft, FaArrowRight, FaStar, FaUserPlus, FaFileAlt, FaUserCheck, FaClipboardCheck, FaLaptopCode } from 'react-icons/fa';
import Acedmics from '@assets/Acedmics.jpeg';
import AIInterview from '@assets/AIinterview.jpg';
import AptitudeTest from '@assets/AptitudeTest.jpg';
import Candidate from '@assets/Candidate.jpeg';
import Performance from '@assets/PerformanceScoring.jpg';
import SmartHiring from '@assets/SmartHiring.jpg';
import Coding from '@assets/coding.jpeg';
import ContactCTA from '../../components/ui/ContactCTA';
import BautifulBusinessWoman from '@assets/beautiful-business-woman.png';
import GroupSixIndian from '@assets/group-six-indian.jpg';
import Colleague from '@assets/colleague.jpg';
import { PricingSection } from '@/pages/findtern-ui/Pricing';

export default function Home() {
  useReveal();

  type CmsSliderItem = {
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    ctaText: string | null;
    ctaHref: string | null;
    sortOrder: number;
    isActive: boolean;
  };

  type CmsPartner = {
    id: string;
    name: string;
    logoUrl: string;
    href: string | null;
    sortOrder: number;
    isActive: boolean;
  };

  type CmsFeaturedSkill = {
    id: string;
    title: string;
    iconClass: string | null;
    metaText: string | null;
    resourceCount?: number | null;
    href: string | null;
    sortOrder: number;
    isActive: boolean;
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

  type CmsPlan = {
    id: string;
    name: string;
    priceText: string | null;
    subtitle: string | null;
    features: string[];
    sortOrder: number;
    isActive: boolean;
  };

  type CmsHome = {
    slider: CmsSliderItem[];
    blogs: any[];
    skills: CmsFeaturedSkill[];
    faces: CmsHappyFace[];
    partners: CmsPartner[];
    plans: CmsPlan[];
    faq: any[];
  };

  const [cms, setCms] = useState<CmsHome | null>(null);
  const [cmsFaces, setCmsFaces] = useState<CmsHappyFace[] | null>(null);
  const [partnersApi, setPartnersApi] = useState<CmsPartner[]>([]);

  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.popular-v2__row[data-step]'));
    if (rows.length === 0) return;

    const grid = document.querySelector<HTMLElement>('.popular-v2__grid');
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.popular-v2__node[data-step]'));
    if (!grid || nodes.length === 0) return;

    const setActive = (step: string | number | undefined | null) => {
      const activeStep = Number(step);
      nodes.forEach((n) => {
        const s = Number(n.dataset.step);
        const isActive = s === activeStep;
        n.classList.toggle('is-active', isActive);
        n.classList.toggle('is-done', s <= activeStep);
        n.classList.toggle('is-upcoming', s > activeStep);
        // accessibility attributes
        try {
          n.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          if (isActive) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current');
        } catch {}
      });

      const activeNode = nodes.find((n) => Number(n.dataset.step) === activeStep);
      if (activeNode) {
        const gridRect = grid.getBoundingClientRect();
        const nodeRect = activeNode.getBoundingClientRect();
        const y = (nodeRect.top - gridRect.top) + nodeRect.height / 2;
        grid.style.setProperty('--popular-v2-progress', `${Math.max(0, Math.round(y))}px`);
      }
    };

    setActive(rows[0]?.dataset?.step);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

        if (visible.length === 0) return;
        const step = (visible[0].target as HTMLElement | null)?.dataset?.step;
        if (step != null) setActive(step);
      },
      {
        root: null,
        threshold: [0.25, 0.4, 0.55, 0.7],
        rootMargin: '-35% 0px -45% 0px',
      }
    );

    rows.forEach((r) => observer.observe(r));
    return () => observer.disconnect();
  }, []);

  // ensure anchors that point to a row focus that row for keyboard/screen reader users
  useEffect(() => {
    const onHash = () => {
      try {
        const id = (window.location.hash || '').slice(1);
        if (!id) return;
        const el = document.getElementById(id) as HTMLElement | null;
        if (el && typeof el.focus === 'function') {
          el.focus();
        }
      } catch {}
    };

    window.addEventListener('hashchange', onHash);
    // handle initial hash on load
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const buildUnsplashSrcSet = (baseUrl: string) => {
    const url = new URL(baseUrl);
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('q', '70');
    const mk = (w: number) => {
      const u = new URL(url.toString());
      u.searchParams.set('w', String(w));
      return `${u.toString()} ${w}w`;
    };
    return [480, 768, 1024, 1200].map(mk).join(', ');
  };

  const partners = useMemo(() => {
    const list = [...(partnersApi ?? [])].filter((p) => p?.isActive);
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return list;
  }, [partnersApi]);

  const partnersMarquee = useMemo(() => {
    if (!partners.length) return [] as CmsPartner[];
    const minPerHalf = 8;
    const half: CmsPartner[] = [];
    const target = Math.max(minPerHalf, partners.length);
    for (let i = 0; half.length < target; i += 1) {
      half.push(partners[i % partners.length]);
    }
    return [...half, ...half];
  }, [partners]);

  const fallbackTestimonials: Testimonial[] = [];

  const homeTestimonials = useMemo<Testimonial[]>(() => {
    const faces = (cmsFaces || [])
      .filter((t) => t && t.isActive !== false)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((t) => ({
        quote: t.quote,
        title: t.title,
        name: t.name,
        company: t.company,
        avatar:
          t.avatarUrl ||
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      }));

    return faces.length ? faces : fallbackTestimonials;
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

  const resolvedTestimonialsBase: Testimonial[] = homeTestimonials.length ? homeTestimonials : fallbackTestimonials;
  const resolvedTestimonials: Testimonial[] = ensureMinTestimonials(resolvedTestimonialsBase, 5);

  const fallbackFeaturedSkills = [
    { id: 'design', title: 'Design', iconClass: 'fa-pen-nib', metaText: null, resourceCount: 235, href: null, sortOrder: 0, isActive: true },
    { id: 'sales', title: 'Sales', iconClass: 'fa-chart-line', metaText: null, resourceCount: 756, href: null, sortOrder: 1, isActive: true },
    { id: 'marketing', title: 'Marketing', iconClass: 'fa-bullhorn', metaText: null, resourceCount: 140, href: null, sortOrder: 2, isActive: true },
    { id: 'finance', title: 'Finance', iconClass: 'fa-wallet', metaText: null, resourceCount: 325, href: null, sortOrder: 3, isActive: true },
    { id: 'technology', title: 'Technology', iconClass: 'fa-desktop', metaText: null, resourceCount: 436, href: null, sortOrder: 4, isActive: true },
    { id: 'engineering', title: 'Engineering', iconClass: 'fa-code', metaText: null, resourceCount: 542, href: null, sortOrder: 5, isActive: true },
    { id: 'business', title: 'Business', iconClass: 'fa-briefcase', metaText: null, resourceCount: 211, href: null, sortOrder: 6, isActive: true },
    { id: 'hr', title: 'Human Resource', iconClass: 'fa-users', metaText: null, resourceCount: 346, href: null, sortOrder: 7, isActive: true },
    { id: 'social-media-content', title: 'Social media and Content', iconClass: 'fa-bullhorn', metaText: null, resourceCount: 0, href: null, sortOrder: 8, isActive: true },
    { id: 'operations', title: 'Operations', iconClass: 'fa-briefcase', metaText: null, resourceCount: 0, href: null, sortOrder: 9, isActive: true },
    { id: 'healthcare', title: 'Healthcare', iconClass: 'fa-star', metaText: null, resourceCount: 0, href: null, sortOrder: 10, isActive: true },
  ];

  const resolvedSkills = useMemo(() => {
    const src = (cms?.skills?.length ? cms.skills : fallbackFeaturedSkills) as CmsFeaturedSkill[];
    return (Array.isArray(src) ? src : [])
      .filter((s) => Boolean(s?.isActive))
      .map((s) => ({
        ...s,
        resourceCount:
          typeof (s as any).resourceCount === 'number' && Number.isFinite((s as any).resourceCount)
            ? (s as any).resourceCount
            : 0,
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [cms?.skills]);

  const skillIcons: Record<string, any> = {
    'fa-pen-nib': FaPenNib,
    'fa-chart-line': FaChartLine,
    'fa-bullhorn': FaBullhorn,
    'fa-wallet': FaWallet,
    'fa-desktop': FaDesktop,
    'fa-code': FaCode,
    'fa-briefcase': FaBriefcase,
    'fa-users': FaUsers,
    'fa-star': FaStar,
    design: FaPenNib,
    sales: FaChartLine,
    marketing: FaBullhorn,
    finance: FaWallet,
    technology: FaDesktop,
    engineering: FaCode,
    business: FaBriefcase,
    hr: FaUsers,
    'social-media-content': FaBullhorn,
    operations: FaBriefcase,
    healthcare: FaStar,
  };

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const current: Testimonial | undefined = resolvedTestimonials[activeTestimonial];

  useEffect(() => {
    if (resolvedTestimonials.length === 0) return;
    setActiveTestimonial((i) => i % resolvedTestimonials.length);
  }, [resolvedTestimonials.length]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website/home', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCms(json);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website/faces', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCmsFaces(Array.isArray(json?.items) ? json.items : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website/partners');
        if (!res.ok) return;
        const json = await res.json();
        const items = Array.isArray(json?.items) ? (json.items as CmsPartner[]) : [];
        if (cancelled) return;
        setPartnersApi(items);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [videoSource, setVideoSource] = useState<string>(heroVideo);
  const [posterSource, setPosterSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const videoCandidates = [
          '/attached_assets/hero.mp4',
          '/attached_assets/coffe.mp4',
        ];

        let pickedVideo: string | null = null;
        for (const url of videoCandidates) {
          try {
            const res = await fetch(url, { method: 'HEAD' });
            if (res.ok) {
              pickedVideo = url;
              break;
            }
          } catch {
            // ignore
          }
        }

        const posterCandidates = [
          '/attached_assets/hero.jpg',
          '/attached_assets/hero.jpeg',
          '/attached_assets/hero.png',
        ];

        let pickedPoster: string | null = null;
        for (const url of posterCandidates) {
          try {
            const res = await fetch(url, { method: 'HEAD' });
            if (res.ok) {
              pickedPoster = url;
              break;
            }
          } catch {
            // ignore
          }
        }

        if (!cancelled) {
          setVideoSource(pickedVideo ?? heroVideo);
          setPosterSource(pickedPoster);
        }
      } catch {
        if (!cancelled) {
          setVideoSource(heroVideo);
          setPosterSource(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // video playback helpers (debugging & status)
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const playPromise = el.play();
    if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
      playPromise.catch(() => {});
    }

    return () => {
      try {
        el.pause();
      } catch {
        // ignore
      }
    };
  }, [videoSource]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          const p = el.play();
          if (p && typeof (p as Promise<void>).catch === 'function') {
            p.catch(() => {});
          }
        } else {
          try {
            el.pause();
          } catch {
            // ignore
          }
        }
      },
      { threshold: 0.15 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-scroll for skill cards on small screens
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [isMobileView, setIsMobileView] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : true));

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const itemsForGrid = isMobileView && resolvedSkills.length > 4 ? [...resolvedSkills, ...resolvedSkills] : resolvedSkills;

  useEffect(() => {
    if (!isMobileView || !gridRef.current || resolvedSkills.length === 0) return;
    const el = gridRef.current;
    let rafId: number;
    let running = true;
    const speed = 0.6; // pixels per frame

    const step = () => {
      if (!running) return;
      el.scrollLeft += speed;
      // loop when we reach half (since items are duplicated)
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      }
      rafId = requestAnimationFrame(step);
    };

    const onEnter = () => { running = false; };
    const onLeave = () => { if (!running) { running = true; step(); } };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('focusin', onEnter);
    el.addEventListener('focusout', onLeave);

    step();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('focusin', onEnter);
      el.removeEventListener('focusout', onLeave);
    };
  }, [isMobileView, resolvedSkills]);

  return (
    <div className="home-page">
      <section className="hero-split-v1">

        <div className="hero-split-v1__media" style={{ position: 'relative' }}>
      

          <video
            ref={videoRef}
            className="hero-split-v1__video"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            poster={posterSource ?? undefined}

            aria-hidden="true"
            tabIndex={-1}
            onLoadedMetadata={() => {
              try {
                const p = videoRef.current?.play();
                if (p && typeof (p as Promise<void>).catch === 'function') {
                  p.catch(() => {});
                }
              } catch {
                // ignore
              }
            }}
            onCanPlay={() => {}}
            onPlaying={() => { setIsVideoPlaying(true); }}
            onError={(e) => { console.error('video error', e); setIsVideoPlaying(false); }}
          >
            {/* try the chosen mp4 first (coffe.mp4), then fallback to bundled mov */}
            <source src={videoSource} type="video/mp4" />
            Your browser does not support HTML video.
          </video>
        </div>

        <div className="hero-split-v1__panels" aria-label="Choose your role">
          <div className="hero-split-v1__panel hero-split-v1__panel--employer" role="group" aria-label="Employers">
            <div className="hero-split-v1__panelInner">
              <div className="hero-split-v1__title">
                Finding the right intern is tough—
                <span className="hero-split-v1__title--second">Findtern makes it easy!</span>
              </div>
              <a className="hero-split-v1__cta" href="/employers" rel="noreferrer">Find Intern</a>
            </div>
          </div>

          <div className="hero-split-v1__panel hero-split-v1__panel--candidate" role="group" aria-label="Candidates">
            <div className="hero-split-v1__panelInner">
              <div className="hero-split-v1__title">
                Finding an internship wasn’t that simpler,
                <span className="hero-split-v1__title--second">let me get one for me.</span>
              </div>
              <a className="hero-split-v1__cta" href="/interns" rel="noreferrer">Get Internship</a>
            </div>
          </div>
        </div>
      </section>

      {partners.length ? (
        <section className="partners-v1 reveal reveal--up is-visible" aria-label="Our partners">
          <div className="container">
            <div className="partners-v1__inner">
              <h2 className="">Our <span className="heading--smile">Partners</span></h2>
              <div className="partners-v1__marquee" aria-label="Partner logos">
                <div className={'partners-v1__track partners-v1__track--marquee'}>
                  {partnersMarquee.map((p, idx) => (
                    <div key={`${p.name}-${idx}`} className="partners-v1__item" title={p.name}>
                      <div className="partners-v1__logo">
                        {p.href ? (
                          <a href={p.href} target="_blank" rel="noreferrer">
                            <img src={p.logoUrl} alt={p.name} loading="lazy" />
                          </a>
                        ) : (
                          <img src={p.logoUrl} alt={p.name} loading="lazy" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="about-section about-us-v2 py-5 reveal reveal--up">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-us-v2__content">
                <h2 className="about-us-v2__title heading--smile">About Us</h2>

                <div className="about-us-v2__block">
                  <h3 className="about-us-v2__heading">Simplifying Intern Hiring</h3>
                  <p className="about-us-v2__text">
                    At Findtern, we believe hiring interns should be effortless, not exhausting. That&apos;s why we&apos;ve built a smart platform that connects companies with pre-vetted, skilled interns in just a few clicks.
                  </p>
                </div>

                <div className="about-us-v2__block">
                  <h3 className="about-us-v2__heading">Our Mission</h3>
                  <p className="about-us-v2__text">
                    To bridge the gap between talented interns and forward-thinking companies, making the hiring process faster, smarter, and more efficient.
                  </p>
                </div>

                <div className="about-us-v2__block">
                  <h3 className="about-us-v2__heading">Why Choose Findtern?</h3>
                  <ul className="about-us-v2__list">
                    <li><FaCheckCircle aria-hidden="true" className="inline-icon"/><strong>Quality Interns</strong> — Handpicked, pre-screened candidates.</li>
                    <li><FaCheckCircle aria-hidden="true" className="inline-icon"/><strong>AI-Powered Matching</strong> — The right fit, every time.</li>
                    <li><FaCheckCircle aria-hidden="true" className="inline-icon"/><strong>Seamless Hiring</strong> — From search to selection, all in one place.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-lg-6 mt-5 mt-lg-0">
              <div className="about-us-v2__media">
                <div className="about-us-v2__circle about-us-v2__circle--lg tilt-3d">
                  <img
                    src={GroupSixIndian}
                    alt="Team discussion"
                    loading="lazy"
                  />
                </div>
                <div className="about-us-v2__circle about-us-v2__circle--sm tilt-3d">
                  <img
                    src={Colleague}
                    alt="Intern working"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className="featured-skills featured-skills-v3 reveal reveal--up">
        <div className="container">
           <h2 className="">Featured <span className="heading--smile">Skills</span></h2>
          <div className="featured-skills-v3__marquee" aria-label="Featured skills">
            <div className={resolvedSkills.length > 4 ? 'featured-skills-v3__track featured-skills-v3__track--marquee' : 'featured-skills-v3__track'} role="list" aria-hidden={resolvedSkills.length > 4 ? 'false' : 'true'}>
              {(resolvedSkills.length > 4 ? [...resolvedSkills, ...resolvedSkills] : resolvedSkills).map((s, idx) => {
                const iconKey = String((s as any)?.iconClass ?? (s as any)?.id ?? '').trim().toLowerCase();
                const Icon = skillIcons[iconKey] ?? FaCircle;
                return (
                  <div
                    key={`${s.id}-${idx}`}
                    className={`featured-skills-v3__card ${s.isActive ? 'is-active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={s.isActive ? 'true' : 'false'}
                    aria-label={`${s.title} category with ${Number((s as any).resourceCount ?? 0).toLocaleString()} resources`}
                  >
                    <div className="featured-skills-v3__cardIcon" aria-hidden="true"><Icon size={22} /></div>
                    <div className="featured-skills-v3__cardInner">
                      <div className="featured-skills-v3__cardTitle">{s.title}</div>
                      <div className="featured-skills-v3__cardMeta">{Number((s as any).resourceCount ?? 0).toLocaleString()} Resources</div>
                    </div>
                  </div>
                );
              })}
            </div>


          </div>
        </div>
      </section>

      <section className="testimonials happy-faces-v3 reveal reveal--up">
        <div className="container">
          <h2 className="">Happy <span className="heading--smile">Faces</span></h2>
          <div
            className="happy-faces-v3__wrap"
          >
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


      <section id="popular" className="popular-v2">
        <div className="container">
  <h2 className="">Why We are Most <span className="heading--smile">Popular</span></h2>
          <div className="popular-v2__grid">
            <div id="popular-step-0" className="popular-v2__row" data-step="0" role="region" aria-labelledby="popular-step-title-0" tabIndex={-1}>
              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={Candidate}
                    alt="Candidate Onboarding"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-0">Candidate Onboarding</h3>
                <p>Interns create their profiles and join the platform.</p>
              </article>

              <div className="popular-v2__center">
                <a href="#popular-step-0" className="popular-v2__node" data-step="0" role="button" tabIndex={0} aria-label="Candidate Onboarding"><FaUserPlus aria-hidden="true" /></a>
              </div>

              <div className="popular-v2__spacer"></div>
            </div>

            <div id="popular-step-1" className="popular-v2__row" data-step="1" role="region" aria-labelledby="popular-step-title-1" tabIndex={-1}>
              <div className="popular-v2__spacer"></div>

              <div className="popular-v2__center">
                <a href="#popular-step-1" className="popular-v2__node" data-step="1" role="button" tabIndex={0} aria-label="Academic Verification"><FaFileAlt aria-hidden="true" /></a>
              </div>

              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={Acedmics}
                    alt="Academic Verification"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-1">Academic Verification</h3>
                <p>They add their academic details, which we verify for authenticity.</p>
              </article>
            </div>

            <div id="popular-step-2" className="popular-v2__row" data-step="2" role="region" aria-labelledby="popular-step-title-2" tabIndex={-1}>
              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={AIInterview}
                    alt="Interest-Based AI Interview"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-2">Interest-Based AI Interview</h3>
                <p>Candidates specify their interest areas, and our AI conducts a tailored interview.</p>
              </article>

              <div className="popular-v2__center">
                <a href="#popular-step-2" className="popular-v2__node" data-step="2" role="button" tabIndex={0} aria-label="Interest-Based AI Interview"><FaUserCheck aria-hidden="true" /></a>
                </div>
            </div>

            <div id="popular-step-3" className="popular-v2__row" data-step="3" role="region" aria-labelledby="popular-step-title-3" tabIndex={-1}>
              <div className="popular-v2__spacer"></div>

              <div className="popular-v2__center">
                <a href="#popular-step-3" className="popular-v2__node" data-step="3" role="button" tabIndex={0} aria-label="Aptitude Test"><FaClipboardCheck aria-hidden="true" /></a>
              </div>

              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={AptitudeTest}
                    alt="Aptitude Test"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-3">Aptitude Test</h3>
                <p>All candidates undergo a structured aptitude test.</p>
              </article>
            </div>

            <div id="popular-step-4" className="popular-v2__row" data-step="4" role="region" aria-labelledby="popular-step-title-4" tabIndex={-1}>
              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={Coding}
                    alt="Coding test"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-4">Coding test</h3>
                <p>Candidates from coding background undergo a live coding test.</p>
              </article>

              <div className="popular-v2__center">
                <a href="#popular-step-4" className="popular-v2__node" data-step="4" role="button" tabIndex={0} aria-label="Coding test"><FaLaptopCode aria-hidden="true" /></a>
                </div>
            </div>

            <div id="popular-step-5" className="popular-v2__row" data-step="5" role="region" aria-labelledby="popular-step-title-5" tabIndex={-1}>
              <div className="popular-v2__spacer"></div>

              <div className="popular-v2__center">
                <a href="#popular-step-5" className="popular-v2__node" data-step="5" role="button" tabIndex={0} aria-label="Performance Scoring"><FaChartLine aria-hidden="true" /></a>
                </div>

              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={Performance}
                    alt="Performance Scoring"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-5">Performance Scoring</h3>
                <p>Each intern receives a Findtern Score based on academics, interview, and test results.</p>
              </article>
            </div>

            <div id="popular-step-6" className="popular-v2__row" data-step="6" role="region" aria-labelledby="popular-step-title-6" tabIndex={-1}>
              <article className="popular-v2__card tilt-3d">
                <div className="popular-v2__img">
                  <img
                    src={SmartHiring}
                    alt="Smart Hiring For Companies"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="popular-v2__label"></div>
                <h3 id="popular-step-title-6">Smart Hiring for Companies</h3>
                <p>Employers can filter, sort, and select interns based on their Findtern Score, skills, and interests.</p>
              </article>

              <div className="popular-v2__center">
                <a href="#popular-step-6" className="popular-v2__node" data-step="6" role="button" tabIndex={0} aria-label="Smart Hiring for Companies"><FaBriefcase aria-hidden="true" /></a>
                </div>

              <div className="popular-v2__spacer"></div>
            </div>
          </div>
        </div>
      </section>
      <PricingSection />

      <ContactCTA />

      <section className="about-cta-v2 reveal reveal--up">
        <div className="container">
          <div className="about-cta-v2__card">
            <div className="about-cta-v2__left">
              <h2 className="heading--smile">Start Hiring or Apply Now!</h2>
              <div className="about-cta-v2__buttons">
                <a className="btn btn-light btn-lg" href="/employers" target="_blank" rel="noreferrer">
                  <FaBriefcase aria-hidden="true" />
                  Hire an Intern
                </a>
                <a className="btn btn-light btn-lg" href="/login" target="_blank" rel="noreferrer">
                  <FaUserPlus aria-hidden="true" />
                  Register For Internship
                </a>
              </div>
            </div>

            <div className="about-cta-v2__right" aria-hidden="true">
              <div className="about-cta-v2__doodles">
                <svg className="about-cta-v2__waves" viewBox="0 0 120 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10c10 0 10 8 20 8s10-8 20-8 10 8 20 8 10-8 20-8 10 8 18 8" stroke="rgba(255,255,255,.75)" strokeWidth="2.6" strokeLinecap="round" />
                  <path d="M2 22c10 0 10 8 20 8s10-8 20-8 10 8 20 8 10-8 20-8 10 8 18 8" stroke="rgba(255,255,255,.75)" strokeWidth="2.6" strokeLinecap="round" />
                  <path d="M2 34c10 0 10 8 20 8s10-8 20-8 10 8 20 8 10-8 20-8 10 8 18 8" stroke="rgba(255,255,255,.75)" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                <div className="about-cta-v2__spark about-cta-v2__spark--a"></div>
                <div className="about-cta-v2__spark about-cta-v2__spark--b"></div>
                <div className="about-cta-v2__spark about-cta-v2__spark--c"></div>
              </div>

              <div className="about-cta-v2__frame">
                <img
                  className="about-cta-v2__person"
                  src={BautifulBusinessWoman}
                  alt=""
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
