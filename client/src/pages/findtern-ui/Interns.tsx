import React from 'react';
import { Link } from 'wouter';
import useReveal from '../../hooks/useReveal.ts';
import { FaBolt, FaCheckCircle, FaMoneyBillWave, FaStar, FaUserPlus } from 'react-icons/fa';
import Candidate from '@assets/Candidate.jpeg';
import Colleague from '@assets/colleague.jpg';
import BautifulBusinessWoman from '@assets/beautiful-business-woman.png';
import ContactCTA from '@/components/ui/ContactCTA.tsx';

export default function Interns() {
  useReveal();

  return (
    <div className="interns-page-v1">
      <section className="interns-hero-v2">
        <div className="interns-hero-v2__bg" aria-hidden="true"></div>''
        <div className="interns interns-hero-v2__inner">
          <div className="interns-hero-v2__content reveal reveal--up is-visible">
            <h1>Findtern for Interns</h1>
            <p>The Findtern Guarantee</p>
          </div>
        </div>
        
      </section>
      <section className="interns-guarantee-v1">
        <div className="container interns-guarantee-v1__grid">
          <div className="interns-guarantee-v1__copy reveal reveal--up is-visible">
            <h1 className="interns-guarantee-v1__title">The <span className='heading--smile'>Findtern</span> Guarantee</h1>
            <div className="interns-guarantee-v1__tag">Your Internship. Guaranteed. Or Your Money Back.</div>
            <p className="interns-guarantee-v1__sub">
              Secure an internship within 18 months with our verified companies — or get a 100% refund.
            </p>

            <div className="interns-guarantee-v1__how">
              <div className="interns-guarantee-v1__howTitle">How It Works</div>
              <ul className="interns-guarantee-v1__list" aria-label="How it works summary">
                <li><FaCheckCircle aria-hidden="true" /><span>Create your account</span></li>
                <li><FaCheckCircle aria-hidden="true" /><span>Complete your AI Interview</span></li>
                <li><FaCheckCircle aria-hidden="true" /><span>Get matched with verified employers</span></li>
                <li><FaCheckCircle aria-hidden="true" /><span>Internship secured — or full refund</span></li>
              </ul>
              <div className="interns-guarantee-v1__fine">No risk. No hidden terms. Just guaranteed opportunities.</div>
            </div>

            <div className="interns-guarantee-v1__ctas">
              <Link className="btn btn-primary" href="/guaranteed-internship-program">Learn More</Link>
            </div>
          </div>

          <div className="interns-guarantee-v1__media" aria-hidden="true">
            <div className="interns-guarantee-v1__circle interns-guarantee-v1__circle--lg">
              <img src={Colleague} alt="" loading="lazy" />
            </div>
            <div className="interns-guarantee-v1__circle interns-guarantee-v1__circle--sm">
              <img src={Candidate} alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="interns-how-v1 reveal reveal--up" id="interns-how">
        <div className="container">
          <h2 className="interns-how-v1__title">How It Works</h2>
          <p className="interns-how-v1__sub">At Findtern, we make it simple to move from registration to placement — with real outcomes.</p>

          <div className="interns-how-v1__grid" aria-label="How it works steps">
            <div className="interns-how-v1__card">
              <div className="interns-how-v1__icon" aria-hidden="true"><FaUserPlus /></div>
              <div className="interns-how-v1__step">1</div>
              <div className="interns-how-v1__name">Sign Up &amp; Register</div>
              <div className="interns-how-v1__text">Pay a ₹2500 refundable fee to activate your profile.</div>
            </div>

            <div className="interns-how-v1__card">
              <div className="interns-how-v1__icon" aria-hidden="true"><FaStar /></div>
              <div className="interns-how-v1__step">2</div>
              <div className="interns-how-v1__name">Get Verified &amp; Rated</div>
              <div className="interns-how-v1__text">Take AI interviews &amp; aptitude tests to showcase your skills.</div>
            </div>

            <div className="interns-how-v1__card">
              <div className="interns-how-v1__icon" aria-hidden="true"><FaBolt /></div>
              <div className="interns-how-v1__step">3</div>
              <div className="interns-how-v1__name">Get Hired Faster</div>
              <div className="interns-how-v1__text">Employers find you based on your ratings &amp; skills.</div>
            </div>

           
          </div>
        </div>
      </section>

     <ContactCTA topCtaLabel="Register Now" topCtaHref="/signup" />
     
           <section className="about-cta-v2 reveal reveal--up">
             <div className="container">
               <div className="about-cta-v2__card">
                 <div className="about-cta-v2__left">
                   <h2 className="heading--smile">Employer? Start finding your Intern</h2>
                   <div className="about-cta-v2__buttons">
                    
                     <a className="btn btn-light btn-lg" href="/login" target="_blank" rel="noreferrer">
                       <FaUserPlus aria-hidden="true" />
                      Hire an Intern
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
