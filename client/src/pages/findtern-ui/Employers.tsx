import React, { useEffect, useState } from 'react';
import useReveal from '../../hooks/useReveal.ts';
import {
  FaBolt,
  FaBriefcase,
  FaCheckCircle,
  FaClock,
  FaCoffee,
  FaCrown,
  FaGift,
  FaMoneyBillWave,
  FaQuestionCircle,
  FaShieldAlt,
  FaUserPlus,
} from 'react-icons/fa';
import Businesspeople from '@assets/businesspeople.png';
import TeamSixOffice from '@assets/team-six-office.jpg';
import GroupSixIndian from '@assets/group-six-indian.jpg';
import ContactCTA from '@/components/ui/ContactCTA.tsx';
import BautifulBusinessWoman from '@assets/beautiful-business-woman.png';
import { Link } from 'wouter';
const StepIconSignUp = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 36C10 24.954 18.954 16 30 16H42C53.046 16 62 24.954 62 36C62 47.046 53.046 56 42 56H30C18.954 56 10 47.046 10 36Z"
      fill="#F1F5FF"
    />
    <path
      d="M20 44.5C20 41.2 22.7 38.5 26 38.5H46C49.3 38.5 52 41.2 52 44.5V46.5H20V44.5Z"
      fill="#EEF2FF"
    />
    <circle cx="34" cy="33" r="8" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="3" />
    <path d="M40 39L49 48" stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" />
    <circle cx="34" cy="33" r="3" fill="#93C5FD" />
    <circle cx="22" cy="27" r="3" fill="#F59E0B" />
    <circle cx="26" cy="24" r="2" fill="#34D399" />
    <circle cx="50" cy="27" r="2" fill="#F472B6" />
    <circle cx="46" cy="24" r="3" fill="#A78BFA" />
  </svg>
);

const StepIconExplore = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 36C10 24.954 18.954 16 30 16H42C53.046 16 62 24.954 62 36C62 47.046 53.046 56 42 56H30C18.954 56 10 47.046 10 36Z"
      fill="#ECFDF5"
    />
    <path
      d="M18 44C18 41.6 20 39.6 22.4 39.6H39.8C41.3 39.6 42.7 40.4 43.4 41.7L45.2 45.2C45.7 46.2 46.7 46.8 47.8 46.8H54C55.7 46.8 57 48.1 57 49.8V51H22.4C20 51 18 49 18 46.6V44Z"
      fill="#93C5FD"
      opacity="0.65"
    />
    <path
      d="M22 46.5C22 44.6 23.6 43 25.5 43H40.5C41.7 43 42.8 43.7 43.3 44.8L44.4 47.2C44.9 48.3 46 49 47.2 49H56"
      stroke="#2563EB"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="44" cy="26" r="10" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="2" />
    <circle cx="44" cy="23.5" r="4" fill="#FDE68A" />
    <path d="M38.5 33C39.8 30.3 41.7 29 44 29C46.3 29 48.2 30.3 49.5 33" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    <circle cx="54" cy="22" r="5" fill="#D1FAE5" />
    <path d="M52.8 22L54 23.2L55.8 20.8" stroke="#16A34A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StepIconHire = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 36C10 24.954 18.954 16 30 16H42C53.046 16 62 24.954 62 36C62 47.046 53.046 56 42 56H30C18.954 56 10 47.046 10 36Z"
      fill="#FFF1F2"
    />
    <circle cx="24" cy="30" r="5" fill="#FCA5A5" />
    <circle cx="36" cy="28" r="6" fill="#93C5FD" />
    <circle cx="48" cy="30" r="5" fill="#FDE68A" />
    <path
      d="M16 48.5C16 44.9 18.9 42 22.5 42H26.5C29.1 42 31.4 43.5 32.5 45.6C33.7 43.9 35.7 42.8 38 42.8H38.5C40.8 42.8 42.8 43.9 44 45.6C45.1 43.5 47.4 42 50 42H50.5C54.1 42 57 44.9 57 48.5V51H16V48.5Z"
      fill="#FFFFFF"
      stroke="#FBCFE8"
      strokeWidth="2"
    />
    <circle cx="54" cy="22" r="6" fill="#D1FAE5" />
    <path d="M52.4 22.1L54 23.7L56.4 20.8" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="20" r="2" fill="#A78BFA" />
    <circle cx="22" cy="18" r="2" fill="#34D399" />
    <circle cx="26" cy="20" r="2" fill="#F59E0B" />
  </svg>
);

export default function Employers() {
  useReveal();

  const hintIsIndia = (() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const tzLower = tz.toLowerCase();
      const lang = navigator.language || '';
      const langLower = lang.toLowerCase();
      const looksLikeIndiaLang = langLower.endsWith('-in') || langLower.includes('-in');
      const looksLikeIndiaTz = tzLower.includes('kolkata') || tzLower.includes('calcutta');
      const looksLikeIndiaOffset = new Date().getTimezoneOffset() === -330;
      return looksLikeIndiaTz || looksLikeIndiaLang || looksLikeIndiaOffset;
    } catch {
      return true;
    }
  })();

  const [resolvedIsIndia, setResolvedIsIndia] = useState<boolean>(() => hintIsIndia);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const countryParam = hintIsIndia ? 'IN' : '';
        const plansUrl = `/api/pricing${countryParam ? `?country=${encodeURIComponent(countryParam)}` : ''}`;
        const plansRes = await fetch(plansUrl, { credentials: 'include' });
        if (cancelled) return;

        if (plansRes.ok) {
          const j = await plansRes.json();
          const nextPlans = Array.isArray(j?.items) ? j.items : [];
          const currencies = new Set(
            nextPlans.map((p: any) => String(p?.currency ?? '').toUpperCase()).filter(Boolean)
          );
          const apiHasINR = currencies.has('INR');
          const apiHasUSD = currencies.has('USD');

          if (apiHasUSD && !apiHasINR) {
            setResolvedIsIndia(false);
          } else if (apiHasINR && !apiHasUSD) {
            // If API only returns INR (global fallback), do NOT force INR for outside-India users.
            setResolvedIsIndia(hintIsIndia);
          } else {
            setResolvedIsIndia(hintIsIndia);
          }
        } else {
          setResolvedIsIndia(hintIsIndia);
        }
      } catch {
        if (!cancelled) setResolvedIsIndia(hintIsIndia);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isIndia = resolvedIsIndia;

  const formatPrice = (inr: number, options?: { suffix?: string }) => {
    const suffix = options?.suffix ?? '';
    const amount = isIndia ? inr : Math.round(inr / 100);
    const currency = isIndia ? 'INR' : 'USD';
    try {
      return `${new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)}${suffix}`;
    } catch {
      return `${isIndia ? `₹${amount}` : `$${amount}`}${suffix}`;
    }
  };

  return (
    <div className="employers-landing-v1">
  
 <section className="coffe-hero-v2">
        <div className="coffe-hero-v2__bg" aria-hidden="true"></div>
        <div className="container coffe-hero-v2__inner">
          <div className="coffe-hero-v2__content reveal reveal--up is-visible">
            <h1>Findtern for Employers</h1>
            <p>Coffee or Intern? Choice is yours!</p>
          </div>
        </div>
      </section>
      <section className="employers-landing-v1__hero reveal reveal--up">
        <div className="container employers-landing-v1__heroInner">
          <div className="employers-landing-v1__heroLeft">
            <div className="employers-landing-v1__kicker">
              <span className="employers-landing-v1__kickerTag">
                <FaCoffee aria-hidden="true" />
                Coffee or Intern? Choice is yours!
              </span>
            </div>

            <h1 className="employers-landing-v1__title">
              Hiring <span className="heading--smile">Interns</span>? We Make It Effortless!
            </h1>

            <ul className="employers-landing-v1__bullets" aria-label="Findtern benefits">
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>AI-Assessed Talent – every intern goes through aptitude tests &amp; AI interviews.</span>
              </li>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Verified Profiles – academic details &amp; skills are pre-checked for authenticity.</span>
              </li>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Smart Filters – instantly find interns by skills, ratings, and availability.</span>
              </li>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Flexible Pricing – choose from free, {formatPrice(100, { suffix: '/hr' })}, or {formatPrice(200, { suffix: '/hr' })} plans.</span>
              </li>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Hire interns faster, cheaper, and smarter with Findtern.</span>
              </li>
            </ul>
<div className="interns-guarantee-v1__ctas">
              <Link className="btn btn-primary" href="/employer/signup">Start Hiring Now</Link>
            </div>
            {/* <div className="employers-landing-v1__heroCtas">
              <a className="btn btn-primary" href="" rel="noreferrer">
                
              </a>
            </div> */}
          </div>

          <div className="employers-landing-v1__heroRight" aria-hidden="true">
            <div className="employers-landing-v1__collage">
              <div className="employers-landing-v1__circle employers-landing-v1__circle--lg">
                <img src={Businesspeople} alt="" loading="lazy" />
              </div>
              <div className="employers-landing-v1__circle employers-landing-v1__circle--md">
                <img src={TeamSixOffice} alt="" loading="lazy" />
              </div>
              <div className="employers-landing-v1__circle employers-landing-v1__circle--sm">
                <img src={GroupSixIndian} alt="" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="employers-landing-v1__problems reveal reveal--up">
        <div className="container">
          <h2 className="employers-landing-v1__centerTitle">
            Hiring Interns Shouldn&apos;t Feel <span className="heading--smile">Hard</span>
          </h2>

          <div className="employers-landing-v1__problemsGrid" aria-label="Problems and Findtern solution">
            <div className="employers-landing-v1__problemCol">
              <div className="employers-landing-v1__problemCard">
                <div className="employers-landing-v1__problemHead">
                  <div className="employers-landing-v1__problemIcon" aria-hidden="true"><FaClock /></div>
                  <div className="employers-landing-v1__problemTitle">Time-consuming screening</div>
                </div>
                <div className="employers-landing-v1__problemText">Shortlisting and interviews take too much time and effort.</div>
              </div>
              <div className="employers-landing-v1__problemCard">
                <div className="employers-landing-v1__problemHead">
                  <div className="employers-landing-v1__problemIcon" aria-hidden="true"><FaShieldAlt /></div>
                  <div className="employers-landing-v1__problemTitle">Unverified profiles</div>
                </div>
                <div className="employers-landing-v1__problemText">Authenticity of skills and academics is hard to trust.</div>
              </div>
            </div>

            <div className="employers-landing-v1__solutionCard">
              <div className="employers-landing-v1__solutionBadge">
                <FaBriefcase aria-hidden="true" />
                FINDTERN
              </div>
              <div className="employers-landing-v1__solutionText">
                Finding the right intern is time-consuming, uncertain, and expensive. But with Findtern, you get pre-vetted, ready-to-work interns in just a few clicks for the price of a coffee! ☕
              </div>
              <ul className="employers-landing-v1__solutionList" aria-label="Findtern advantages">
                <li><FaCheckCircle aria-hidden="true" />AI-Assessed Talent</li>
                <li><FaCheckCircle aria-hidden="true" />Verified Profiles</li>
                <li><FaCheckCircle aria-hidden="true" />Smart Filters</li>
                <li><FaCheckCircle aria-hidden="true" />Flexible Pricing</li>
              </ul>
            </div>

            <div className="employers-landing-v1__problemCol">
              <div className="employers-landing-v1__problemCard">
                <div className="employers-landing-v1__problemHead">
                  <div className="employers-landing-v1__problemIcon" aria-hidden="true"><FaQuestionCircle /></div>
                  <div className="employers-landing-v1__problemTitle">Uncertain quality</div>
                </div>
                <div className="employers-landing-v1__problemText">You don&apos;t know who will actually perform until it&apos;s too late.</div>
              </div>
              <div className="employers-landing-v1__problemCard">
                <div className="employers-landing-v1__problemHead">
                  <div className="employers-landing-v1__problemIcon" aria-hidden="true"><FaMoneyBillWave /></div>
                  <div className="employers-landing-v1__problemTitle">Expensive hiring</div>
                </div>
                <div className="employers-landing-v1__problemText">Multiple rounds and overhead make intern hiring costly.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="employers-landing-v1__plans reveal reveal--up">
        <div className="container">
          <h2 className="employers-landing-v1__centerTitle">
            Simple &amp; Transparent <span className="heading--smile">Pricing</span>
          </h2>

          <div className="employers-landing-v1__plansGrid" aria-label="Pricing plans">
            <div className="employers-landing-v1__planCard">
              <div className="employers-landing-v1__planTop">
                <div className="employers-landing-v1__planName">
                  <span className="employers-landing-v1__planIcon" aria-hidden="true"><FaGift /></span>
                  Free Plan
                </div>
                <div className="employers-landing-v1__planPrice">{formatPrice(5000)} <span className="employers-landing-v1__planPriceSub">per hire</span></div>
              </div>
              <div className="employers-landing-v1__planDesc">Hire from a pool of interns (ratings up to 6).</div>
              <ul className="employers-landing-v1__planList" aria-label="Free plan features">
                <li><FaCheckCircle aria-hidden="true" />Verified basics &amp; profiles</li>
                <li><FaCheckCircle aria-hidden="true" />Quick shortlisting</li>
                <li><FaCheckCircle aria-hidden="true" />Best for early-stage hiring</li>
              </ul>
            </div>

            <div className="employers-landing-v1__planCard employers-landing-v1__planCard--featured">
              <div className="employers-landing-v1__planBadge" aria-hidden="true"><FaBolt /> Popular</div>
              <div className="employers-landing-v1__planTop">
                <div className="employers-landing-v1__planName">
                  <span className="employers-landing-v1__planIcon" aria-hidden="true"><FaBolt /></span>
                  {formatPrice(100, { suffix: '/hr' })} Plan
                </div>
                <div className="employers-landing-v1__planPrice">Skilled interns <span className="employers-landing-v1__planPriceSub">(ratings 6-8)</span></div>
              </div>
              <div className="employers-landing-v1__planDesc">Minimum 160-hour commitment.</div>
              <ul className="employers-landing-v1__planList" aria-label="100 per hour plan features">
                <li><FaCheckCircle aria-hidden="true" />Stronger skills &amp; projects</li>
                <li><FaCheckCircle aria-hidden="true" />Better screening signals</li>
                <li><FaCheckCircle aria-hidden="true" />Great value for teams</li>
              </ul>
            </div>

            <div className="employers-landing-v1__planCard">
              <div className="employers-landing-v1__planTop">
                <div className="employers-landing-v1__planName">
                  <span className="employers-landing-v1__planIcon" aria-hidden="true"><FaCrown /></span>
                  {formatPrice(200, { suffix: '/hr' })} Plan
                </div>
                <div className="employers-landing-v1__planPrice">Top-rated talent <span className="employers-landing-v1__planPriceSub">(8+ rating)</span></div>
              </div>
              <div className="employers-landing-v1__planDesc">Verified communication &amp; aptitude skills.</div>
              <ul className="employers-landing-v1__planList" aria-label="200 per hour plan features">
                <li><FaCheckCircle aria-hidden="true" />Aptitude + communication verified</li>
                <li><FaCheckCircle aria-hidden="true" />Ready-to-work interns</li>
                <li><FaCheckCircle aria-hidden="true" />Best for priority roles</li>
              </ul>
            </div>
          </div>

          <div className="employers-landing-v1__plansCta">
            <a className="btn btn-dark" href="/pricing" rel="noreferrer">
              See Full Pricing
            </a>
          </div>
        </div>
      </section>

      <section className="employers-landing-v1__steps reveal reveal--up">
        <div className="container">
          <h2 className="employers-landing-v1__centerTitle">
            Start <span className="heading--smile">Hiring</span> in 3 Easy Steps
          </h2>

          <div className="employers-landing-v1__stepsGrid" aria-label="3 step process">
            <div className="employers-landing-v1__stepCard">
              <div className="employers-landing-v1__stepIcon" aria-hidden="true">
                <StepIconSignUp />
              </div>
              <div className="employers-landing-v1__stepTitle">Sign Up &amp; start the search</div>
              <div className="employers-landing-v1__stepText">Tell us what kind of intern you need.</div>
            </div>

            <div className="employers-landing-v1__stepCard">
              <div className="employers-landing-v1__stepIcon" aria-hidden="true">
                <StepIconExplore />
              </div>
              <div className="employers-landing-v1__stepTitle">Explore Pre-Vetted Interns</div>
              <div className="employers-landing-v1__stepText">Filter by skills, rating, and availability.</div>
            </div>

            <div className="employers-landing-v1__stepCard">
              <div className="employers-landing-v1__stepIcon" aria-hidden="true">
                <StepIconHire />
              </div>
              <div className="employers-landing-v1__stepTitle">Hire Instantly</div>
              <div className="employers-landing-v1__stepText">Get started with just a few clicks.</div>
            </div>
          </div>
        </div>
      </section>

  

      <ContactCTA />

      <section className="about-cta-v2 reveal reveal--up">
        <div className="container">
          <div className="about-cta-v2__card">
            <div className="about-cta-v2__left">
              <h2 className="heading--smile">Intern? Let&apos;s find you an Internship</h2>
              <div className="about-cta-v2__buttons">
                <a className="btn btn-light btn-lg" href="/login" rel="noreferrer">
                  <FaUserPlus aria-hidden="true" />
                  Continue as Intern
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

