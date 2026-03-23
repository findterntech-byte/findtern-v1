import React, { useId, useState } from 'react';
import { Link } from 'wouter';
import useReveal from '../../hooks/useReveal.ts';
import {
  FaCertificate,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaLock,
  FaMoneyBillWave,
  FaUserCheck,
  FaUserPlus,
  FaUserShield
} from 'react-icons/fa';
import Candidate from '@assets/Candidate.jpeg';
import GroupSixIndian from '@assets/group-six-indian.jpg';
import BautifulBusinessWoman from '@assets/businesspeople.png';


import AiInterview from '@assets/ai-interview.jpeg';
import LockPeriod from '@assets/lock-period.jpg';
import Refund from '@assets/refund.jpeg';
import InternshipGuarantee from '@assets/Internship-Guarantee.jpg';
import InternshipOfferse from '@assets/Internship-Offerse.jpeg';



export default function GuaranteedProgram() {
  useReveal();

  const faqBaseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  const howSteps = [
    {
      id: 'sign-up',
      n: 1,
      title: 'Sign Up & Apply',
      text: 'Join Findtern and activate the Guaranteed Internship Program.'
    },
    {
      id: 'ai-interview',
      n: 2,
      title: 'AI Interview & Rating',
      text: 'Take our AI-powered interview to evaluate your skills and aptitude.'
    },
    {
      id: 'visibility',
      n: 3,
      title: 'Profile Visibility',
      text: 'Your profile is instantly shared with verified hiring companies.'
    },
    {
      id: 'placement',
      n: 4,
      title: 'Internship Placement',
      text: 'Based on your rating, you’ll be matched to a paid or approved internship.'
    },
    {
      id: 'outcome',
      n: 5,
      title: 'Guaranteed Outcome',
      text: 'Get placed within 18 months, or receive a full refund if we fail.'
    },
  ];

  const faqs = [
    {
      id: 'what-is-program',
      q: 'What is the Guaranteed Internship Program?',
      a: 'It’s a structured process where you complete screening (AI interview + tests), become visible to verified employers, and we work to get you placed within 18 months — or your fee is refunded as per the terms.'
    },
    {
      id: 'how-does-work',
      q: 'How does the program work?',
      a: 'You sign up, complete the evaluation, improve your profile score, and get matched with verified employers. You can apply to opportunities and get shortlisted based on your score and fit.'
    },
    {
      id: 'who-eligible',
      q: 'Who is eligible?',
      a: 'Students and early-career candidates who complete onboarding, provide accurate details, and finish the AI interview + required tests as part of the process.'
    },
    {
      id: 'refund-how',
      q: 'How does the refund work?',
      a: 'If we are unable to provide an internship within 18 months of completing the AI interview, the registration fee is refundable in full as per the Terms & Conditions.'
    },
    {
      id: 'hidden-charges',
      q: 'Are there any hidden charges?',
      a: 'No. The program is designed to be transparent. You’ll always see what you’re paying for and what steps are required.'
    },
  ];

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="gip-v1">
      <section className="interns-hero-v2">
        <div className="interns-hero-v2__bg" aria-hidden="true"></div>
        <div className="container interns-hero-v2__inner">
          <div className="interns-hero-v2__content reveal reveal--up is-visible">
            <h1>Guaranteed Internship Program</h1>
            <p>Your Internship. Guaranteed. Or Your Money Back.</p>
          </div>
        </div>
      </section>
      <section className="gip-v1__hero">
        <div className="gip-v1__heroBg" aria-hidden="true">
          <span className="gip-v1__heroBlob gip-v1__heroBlob--a" />
          <span className="gip-v1__heroBlob gip-v1__heroBlob--b" />
          <span className="gip-v1__heroBlob gip-v1__heroBlob--c" />
          <span className="gip-v1__heroGlyph gip-v1__heroGlyph--cupA" />
          <span className="gip-v1__heroGlyph gip-v1__heroGlyph--cupB" />
          <span className="gip-v1__heroGlyph gip-v1__heroGlyph--spark" />
        </div>
        <div className="container gip-v1__heroInner">
          <div className="gip-v1__heroCopy reveal reveal--up">
            <div className="gip-v1__kicker">Guaranteed Internship Program</div>
            <h1 className="gip-v1__title">Your Internship. Guaranteed. <span>Or Your Money Back.</span></h1>
            <p className="gip-v1__subtitle">
              A clear, step-by-step path from sign-up to placement — designed for confidence, transparency, and real outcomes.
            </p>

            <div className="gip-v1__heroCtas">
              <Link className="btn btn-primary" href="/signup">Sign Up Now</Link>
              <Link className="btn btn-outline" href="/interns">Back to Interns</Link>
            </div>

            <div className="gip-v1__heroBadges" aria-label="Program highlights">
              <div className="gip-v1__badge"><FaClock aria-hidden="true" /><span>18-month guarantee window</span></div>
              <div className="gip-v1__badge"><FaLock aria-hidden="true" /><span>Verified employers</span></div>
              <div className="gip-v1__badge"><FaMoneyBillWave aria-hidden="true" /><span>Refund assurance</span></div>
            </div>
          </div>

          <div className="gip-v1__heroMedia" aria-hidden="true">
            <div className="gip-v1__heroImageWrap">
              <img className="gip-v1__heroImage" src={GroupSixIndian} alt="" loading="eager" fetchPriority="high" decoding="async" />
            </div>
          </div>
        </div>
      </section>

      <section className="gip-v1__section" id="how-it-works">
        <div className="container">
          <div className="gip-v1__sectionHead reveal reveal--up">
            <h2 className="gip-v1__h2">How it works</h2>
            <p className="gip-v1__sub">One simple flow — you always know what’s next.</p>
          </div>

          <div className="gip-flow" aria-label="How it works steps">
            <svg className="gip-flow__path" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
              <path
                d="M110 40 H860 Q890 40 890 70 V170 Q890 200 860 200 H140 Q110 200 110 230 V270 Q110 300 140 300 H860 Q890 300 890 330 V390 Q890 420 860 420 H110"
                stroke="#0f6a53"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>

            <div className="gip-flow__item gip-flow__item--1 reveal reveal--up">
              <div className="gip-flow__node" aria-hidden="true">1</div>
              <div className="gip-flow__card">
                <div className="gip-flow__title">Sign Up &amp; Apply</div>
                <div className="gip-flow__text">Join Findtern and activate the Guaranteed Internship Program.</div>
              </div>
            </div>

            <div className="gip-flow__item gip-flow__item--2 gip-flow__item--right reveal reveal--up">
              <div className="gip-flow__node" aria-hidden="true">2</div>
              <div className="gip-flow__card">
                <div className="gip-flow__title">AI Interview &amp; Rating</div>
                <div className="gip-flow__text">Take our AI-powered interview to evaluate your skills and aptitude.</div>
              </div>
            </div>

            <div className="gip-flow__item gip-flow__item--3 reveal reveal--up">
              <div className="gip-flow__node" aria-hidden="true">3</div>
              <div className="gip-flow__card">
                <div className="gip-flow__title">Profile Visibility</div>
                <div className="gip-flow__text">Your profile is instantly shared with verified hiring companies.</div>
              </div>
            </div>

            <div className="gip-flow__item gip-flow__item--4 gip-flow__item--right reveal reveal--up">
              <div className="gip-flow__node" aria-hidden="true">4</div>
              <div className="gip-flow__card">
                <div className="gip-flow__title">Internship Placement</div>
                <div className="gip-flow__text">Based on your rating, you’ll be matched to a paid or approved internship.</div>
              </div>
            </div>

            <div className="gip-flow__item gip-flow__item--5 reveal reveal--up">
              <div className="gip-flow__node" aria-hidden="true">5</div>
              <div className="gip-flow__card">
                <div className="gip-flow__title">Guaranteed Outcome</div>
                <div className="gip-flow__text">Get placed within 18 months, or receive a full refund if we fail.</div>
              </div>
            </div>
          </div>

          <div className="gip-flow-stack" aria-label="How it works steps (mobile)">
            {howSteps.map((s) => (
              <div key={s.id} className="gip-v1__step reveal reveal--up">
                <div className="gip-v1__stepNode">{s.n}</div>
                <div className="gip-v1__stepCard">
                  <div className="gip-v1__stepTitle">{s.title}</div>
                  <div className="gip-v1__stepText">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gip-v1__section gip-v1__section--alt" id="terms">
        <div className="container">
          <div className="gip-v1__sectionHead reveal reveal--up">
            <h2 className="gip-v1__h2">Terms & conditions</h2>
            <p className="gip-v1__sub">Clear rules. No surprises. Built for trust.</p>
          </div>

          <div className="gip-v1__termsGrid" aria-label="Program terms">
            <article className="gip-v1__termCard reveal reveal--up">
              <div className="gip-v1__termMedia" aria-hidden="true">
                <div className="gip-v1__termImage">
                  <img src={InternshipGuarantee} alt="Internship guarantee" />
                </div>
              </div>
              <div className="gip-v1__termBody">
                <div className="gip-v1__termTitle">1. Internship guarantee</div>
                <div className="gip-v1__termText">You’ll be placed in an internship within 18 months of your admission.</div>
              </div>
            </article>

            <article className="gip-v1__termCard reveal reveal--up">
              <div className="gip-v1__termMedia" aria-hidden="true">
                <div className="gip-v1__termImage">
                  <img src={Refund} alt="Refund assurance" />
                </div>
              </div>
              <div className="gip-v1__termBody">
                <div className="gip-v1__termTitle">2. Refund assurance</div>
                <div className="gip-v1__termText">Placement not chosen within the period, we will release a 100% refund.</div>
              </div>
            </article>

            <article className="gip-v1__termCard reveal reveal--up">
              <div className="gip-v1__termMedia" aria-hidden="true">
                <div className="gip-v1__termImage">
                  <img src={LockPeriod} alt="Lock-in period" />
                </div>
              </div>
              <div className="gip-v1__termBody">
                <div className="gip-v1__termTitle">3. Lock-in Period</div>
                <div className="gip-v1__termText">The program has a one year lock-in. Refunds are processed only after the 18 months window ends.</div>
              </div>
            </article>

            <article className="gip-v1__termCard reveal reveal--up">
              <div className="gip-v1__termMedia" aria-hidden="true">
                <div className="gip-v1__termImage">
                  <img src={AiInterview} alt="AI Interview" />
                </div>
              </div>
              <div className="gip-v1__termBody">
                <div className="gip-v1__termTitle">4. AI Interview & Rating</div>
                <div className="gip-v1__termText">Your internship offer depends on your performance in the AI Interview. Includes: Resume & Interview prep, Mock Interview, Rating / Grade – evaluate your readiness within 18 months, Recruiter profiles shortlisted as per your skillset, verified and trusted</div>
              </div>
            </article>

            <article className="gip-v1__termCard reveal reveal--up">
              <div className="gip-v1__termMedia" aria-hidden="true">
                <div className="gip-v1__termImage">
                  <img src={InternshipOfferse} alt="Internship offers" />
                </div>
              </div>
              <div className="gip-v1__termBody">
                <div className="gip-v1__termTitle">5. Internship Offers</div>
                <div className="gip-v1__termText">You must actively apply to the places. If you don’t want an internship offer, you will not be eligible for a refund.</div>
              </div>
            </article>
          </div>

        </div>
      </section>

      <section className="gip-v1__section" id="why-choose">
        <div className="container gip-v1__whyGrid">
          <div className="gip-v1__whyCopy reveal reveal--up">
            <h2 className="gip-v1__h2">Why choose Findtern</h2>
            <p className="gip-v1__sub gip-v1__sub--left">Faster shortlisting, better-fit matches, and a transparent path to placement.</p>

            <ul className="gip-v1__whyList" aria-label="Why choose Findtern list">
              <li><FaCheckCircle aria-hidden="true" /><span>AI-driven screening to show your strengths clearly</span></li>
              <li><FaCheckCircle aria-hidden="true" /><span>Verified employers and relevant internship roles</span></li>
              <li><FaCheckCircle aria-hidden="true" /><span>Transparent scoring and structured evaluation</span></li>
              <li><FaCheckCircle aria-hidden="true" /><span>Guided flow from onboarding to placement</span></li>
            </ul>

            <div className="gip-v1__whyCtas">
              <Link className="btn btn-primary" href="/signup">Get Started</Link>
              <Link className="btn btn-outline" href="/faq">View FAQ</Link>
            </div>
          </div>

          <div className="gip-v1__whyMedia reveal reveal--up" aria-hidden="true">
            <div className="gip-v1__whyImageWrap">
              <img className="gip-v1__whyImage" src={Candidate} alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

  <section className="about-cta-v2 reveal reveal--up">
        <div className="container">
          <div className="about-cta-v2__card">
            <div className="about-cta-v2__left">
              <h2 className="heading--smile">Start your career with confidence.</h2>
               <div className="gip-v1__ctaText mb-4">Join the Guaranteed Internship Program today and take control of your path.</div>
              <div className="about-cta-v2__buttons">
                <a className="btn btn-light btn-lg" href="/signup" rel="noreferrer">
                  <FaUserPlus aria-hidden="true" />
                  Sign Up Now
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
    

      <section className="gip-v1__section gip-v1__section--alt" id="faq">
        <div className="container">
          <div className="gip-v1__sectionHead reveal reveal--up">
            <h2 className="gip-v1__h2">Guaranteed Program FAQ</h2>
            <p className="gip-v1__sub">Quick answers about the guarantee, eligibility, and refunds.</p>
          </div>

          <div className="gip-v1__faq" role="region" aria-label="Guaranteed program frequently asked questions">
            {faqs.map((item) => {
              const qId = `${faqBaseId}-${item.id}-q`;
              const aId = `${faqBaseId}-${item.id}-a`;
              const isOpen = openId === item.id;

              return (
                <div key={item.id} className={`gip-v1__faqItem ${isOpen ? 'open' : ''}`}>
                  <button
                    id={qId}
                    type="button"
                    className="gip-v1__faqQ"
                    onClick={() => toggle(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={aId}
                  >
                    <span className="gip-v1__faqQText">{item.q}</span>
                    <span className="gip-v1__faqIcon" aria-hidden="true">+</span>
                  </button>

                  <div
                    id={aId}
                    className="gip-v1__faqA"
                    role="region"
                    aria-labelledby={qId}
                    hidden={!isOpen}
                  >
                    <div className="gip-v1__faqAInner">{item.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
