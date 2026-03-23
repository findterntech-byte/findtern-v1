import React, { useEffect, useMemo, useState } from 'react';
import useReveal from '../../hooks/useReveal.ts';
import { FaCheckCircle, FaArrowLeft, FaArrowRight, FaStar, FaBriefcase, FaUserPlus } from 'react-icons/fa';
import GroupSixIndian from '@assets/group-six-indian.jpg';
import Colleague from '@assets/colleague.jpg';
import Acedmics from '@assets/Acedmics.jpeg';
import Candidate from '@assets/Candidate.jpeg';
import Businesspeople from '@assets/businesspeople.png';
import TeamSixOffice from '@assets/team-six-office.jpg';
import BautifulBusinessWoman from '@assets/beautiful-business-woman.png';
export default function About() {
  useReveal();

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

  const [cmsFaces, setCmsFaces] = useState<CmsHappyFace[] | null>(null);

  const fallbackTestimonials: Testimonial[] = [];

  const aboutTestimonials = useMemo<Testimonial[]>(() => {
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

  const resolvedTestimonials = useMemo(() => ensureMinTestimonials(aboutTestimonials, 5), [aboutTestimonials]);

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const current: Testimonial | undefined = resolvedTestimonials[activeTestimonial];

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
    if (!aboutTestimonials.length) return;
    setActiveTestimonial((i) => i % resolvedTestimonials.length);
  }, [aboutTestimonials.length, resolvedTestimonials.length]);

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
    <div className="about-page-v2">
      <section className="about-hero-v2">
        <div className="about-hero-v2__bg" aria-hidden="true"></div>
        <div className="container about-hero-v2__inner">
          <div className="about-hero-v2__content reveal reveal--up is-visible">
            <h1>About us</h1>
            <p>Simplifying intern hiring with smart matching, verified profiles, and transparent scoring.</p>
          </div>
        </div>
      </section>

      <section className="about-section about-us-v2 about-page-v2__intro reveal reveal--up">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-us-v2__content">
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
                    alt="Team"
                    loading="lazy"
                  />
                </div>
                <div className="about-us-v2__circle about-us-v2__circle--sm tilt-3d">
                  <img
                    src={Colleague}
                    alt="Work"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-values-v2 reveal reveal--up">
        <div className="container">
           <h2 className="">Our <span className="heading--smile">Values</span></h2>
          <p className="about-values-v2__sub">At Findtern, our values shape the way we connect talent with opportunities. We are committed to:</p>
          <div className="about-values-v2__grid reveal-stagger reveal reveal--up">
            <div className="about-values-v2__card about-values-v2__card--span2 ">
              <div className="about-values-v2__icon about-values-v2__icon--illu" aria-hidden="true">
                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="22" width="44" height="34" rx="10" fill="#FFFFFF" fillOpacity="0.22"/>
                  <rect x="16" y="26" width="36" height="26" rx="8" fill="#FFFFFF" fillOpacity="0.24"/>
                  <path d="M23 30h22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
                  <path d="M23 36h22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
                  <path d="M23 42h16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
                  <path d="M34 14c4 0 7 3 7 7 0 2-1 4-2 5l-2 2h-6l-2-2c-1-1-2-3-2-5 0-4 3-7 7-7Z" fill="#FDE68A"/>
                  <path d="M31 28h6v6h-6z" fill="#F59E0B"/>
                  <path d="M30 35h8" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="about-values-v2__title">Transparency</div>
              <div className="about-values-v2__text">We ensure a fair and open platform where both interns and organizations can make informed decisions.</div>
            </div>
            <div className="about-values-v2__card about-values-v2__card--span2 tilt-3d">
              <div className="about-values-v2__icon about-values-v2__icon--illu" aria-hidden="true">
                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="34" cy="34" r="18" fill="#E8F3EF"/>
                  <path d="M25 42l8-8 4 4 6-6 4 4-10 10-4-4-8 8-4-4Z" fill="#0F766E"/>
                  <path d="M44 24h8v8h-8z" fill="#F59E0B"/>
                  <path d="M18 30h10v10H18z" fill="#60A5FA"/>
                  <circle cx="34" cy="34" r="7" fill="#FDE68A"/>
                  <path d="M34 28l1.8 3.6L40 32l-3 2.8L37.6 39 34 37.1 30.4 39 31 34.8 28 32l4.2-.4L34 28Z" fill="#F59E0B"/>
                </svg>
              </div>
              <div className="about-values-v2__title">Quality</div>
              <div className="about-values-v2__text">We prioritize pre-vetted profiles and meaningful opportunities to create valuable career experiences.</div>
            </div>
            <div className="about-values-v2__card about-values-v2__card--span2 tilt-3d">
              <div className="about-values-v2__icon about-values-v2__icon--illu" aria-hidden="true">
                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="34" cy="34" r="18" fill="#E8F3EF"/>
                  <path d="M25 37c0-5 4-9 9-9 5 0 9 4 9 9 0 3-1 5-3 7l-2 2H30l-2-2c-2-2-3-4-3-7Z" fill="#FDE68A"/>
                  <rect x="30" y="46" width="16" height="6" rx="3" fill="#F59E0B"/>
                  <path d="M24 26l4 4" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M44 30l4-4" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M20 36h6" stroke="#0F766E" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M42 36h6" stroke="#0F766E" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="about-values-v2__title">Innovation</div>
              <div className="about-values-v2__text">We leverage technology to streamline hiring, making the process efficient and hassle-free.</div>
            </div>
            <div className="about-values-v2__card about-values-v2__card--span3 tilt-3d">
              <div className="about-values-v2__icon about-values-v2__icon--illu" aria-hidden="true">
                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="34" cy="34" r="18" fill="#EEF2FF"/>
                  <path d="M26 42c4 0 6-3 8-5 2-2 3-3 6-3 3 0 6 2 6 5 0 5-6 10-13 10-4 0-7-1-9-3l2-4Z" fill="#60A5FA"/>
                  <path d="M31 26c2-2 5-2 7 0 2-2 5-2 7 0 2 2 2 5 0 7l-7 7-7-7c-2-2-2-5 0-7Z" fill="#F472B6"/>
                  <path d="M22 44c2 0 4 1 6 2" stroke="#0F766E" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="about-values-v2__title">Empowerment</div>
              <div className="about-values-v2__text">We support students by providing access to the right internships that fuel their career growth.</div>
            </div>
            <div className="about-values-v2__card about-values-v2__card--span3 tilt-3d">
              <div className="about-values-v2__icon about-values-v2__icon--illu" aria-hidden="true">
                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="34" cy="34" r="18" fill="#E8F3EF"/>
                  <circle cx="28" cy="30" r="5" fill="#FDE68A"/>
                  <circle cx="40" cy="30" r="5" fill="#FCA5A5"/>
                  <path d="M20 48c1-6 6-10 12-10s11 4 12 10" fill="#0F766E" fillOpacity="0.18"/>
                  <path d="M24 48c1-4 4-7 8-7s7 3 8 7" fill="#0F766E" fillOpacity="0.28"/>
                  <rect x="30" y="21" width="8" height="8" rx="2" fill="#60A5FA"/>
                </svg>
              </div>
              <div className="about-values-v2__title">Collaboration</div>
              <div className="about-values-v2__text">We believe in fostering strong partnerships between organizations and emerging talent.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-advantage-v3 reveal reveal--up">
        <div className="container">
          <div className="about-advantage-v3__grid">
            <div className="about-advantage-v3__media">
              <div className="about-advantage-v3__circle about-advantage-v3__circle--lg tilt-3d">
                <img
                  src={Businesspeople}
                  alt="Team"
                  loading="lazy"
                />
              </div>
              <div className="about-advantage-v3__circle about-advantage-v3__circle--sm tilt-3d">
                <img
                  src={TeamSixOffice}
                  alt="Team collaboration"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="about-advantage">
                <h2 className="">How <span className="heading--smile"> Findtern</span> Can Be Your Advantage?</h2>
              {/* <h2>How <span>Findtern</span> Can Be Your Advantage?</h2> */}
              <p className="about-advantage-v3__sub">
                Findtern is designed to make intern hiring seamless, efficient, and impactful. Here’s how we add value:
              </p>

              <div className="about-advantage-v3__list">
                <div className="about-advantage-v3__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div>
                    <strong>Pre‑Vetted Talent</strong> – Access a pool of screened and skilled interns, ensuring quality hires from day one.
                  </div>
                </div>
                <div className="about-advantage-v3__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div>
                    <strong>Smart Matching</strong> – Our advanced filters and AI‑driven recommendations help you find the right fit faster.
                  </div>
                </div>
                <div className="about-advantage-v3__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div>
                    <strong>Time & Cost Efficiency</strong> – Reduce hiring timelines and overhead costs with our streamlined process.
                  </div>
                </div>
                <div className="about-advantage-v3__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div>
                    <strong>Seamless Communication</strong> – Schedule interviews, manage applications, and track progress—all in one place.
                  </div>
                </div>
                <div className="about-advantage-v3__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div>
                    <strong>Scalability</strong> – Whether you’re a startup or an enterprise, Findtern adapts to your hiring needs effortlessly.
                  </div>
                </div>
              </div>

              <div className="about-advantage-v3__note">
                <strong>Let Findtern be your hiring partner, so you can focus on building the future.</strong>
              </div>
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

      <section className="about-solution-v1 reveal reveal--up">
        <div className="container">
          <div className="about-solution-v1__grid">
            <div className="about-solution-v1__content">
                <h2 className="">Multiple Problems, One Solution –  <span className="heading--smile">Findtern</span></h2>
              <p className="about-solution-v1__sub">
                Hiring interns can be challenging—sorting through unqualified applications, slow recruitment cycles, and lack of structured hiring processes. Findtern eliminates these hurdles with a single, smart solution.
              </p>

              <div className="about-solution-v1__list">
                <div className="about-solution-v1__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div><strong>Struggling to find the right interns?</strong> – Get access to a curated pool of pre‑vetted candidates.</div>
                </div>
                <div className="about-solution-v1__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div><strong>Poor Communication skills?</strong> – Is no more a challenge now, with our AI Interview process, profiles are filtered with good communication skills.</div>
                </div>
                <div className="about-solution-v1__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div><strong>Too much time spent on screening?</strong> – Our smart matching system does the hard work for you.</div>
                </div>
                <div className="about-solution-v1__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div><strong>Difficulty managing applications?</strong> – Track, shortlist, and schedule interviews effortlessly on one platform.</div>
                </div>
                <div className="about-solution-v1__item">
                  <FaCheckCircle aria-hidden="true" />
                  <div><strong>Worried about intern retention?</strong> – Findtern connects you with motivated candidates eager to contribute.</div>
                </div>
              </div>

              <div className="about-solution-v1__note">
                No more delays. No more mismatches. Just the right interns, at the right time. <strong>Findtern – Your Ultimate Internship Hiring Solution.</strong>
              </div>
            </div>

            <div className="about-solution-v1__media">
              <div className="about-solution-v1__circle about-solution-v1__circle--lg tilt-3d">
                <img
                  src={Candidate}
                  alt="Professional team"
                  loading="lazy"
                />
              </div>
              <div className="about-solution-v1__circle about-solution-v1__circle--sm tilt-3d">
                <img
                  src={Acedmics}
                  alt="Team meeting"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

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
