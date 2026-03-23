import React, { useEffect, useState } from 'react';

export default function Terms() {
  const [dbTerms, setDbTerms] = useState<{ title: string; bodyHtml: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch('/api/admin/intern/terms', { credentials: 'include' });
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
              <div
                className="terms-v1__content"
                dangerouslySetInnerHTML={{ __html: dbTerms.bodyHtml }}
              />
            </article>
          </div>
        </section>
      </div>
    );
  }

  return <StaticTerms />;
}

function StaticTerms() {
  const sections = [
    { id: 'acceptance-of-terms', title: '1. Acceptance of Terms' },
    { id: 'user-registration-account-security', title: '2. User Registration & Account Security' },
    { id: 'collection-use-of-personal-data', title: '3. Collection & Use of Personal Data' },
    { id: 'platform-usage-guidelines', title: '4. Platform Usage & Guidelines' },
    { id: 'payment-refund-policy', title: '5. Payment & Refund Policy' },
    { id: 'data-sharing-privacy', title: '6. Data Sharing & Privacy' },
    { id: 'account-suspension-termination', title: '7. Account Suspension & Termination' },
    { id: 'conversion-fee', title: '8. Internship to Full‑Time Conversion Fee' },
    { id: 'changes-to-terms', title: '9. Changes to Terms & Conditions' },
    { id: 'contact-us', title: '10. Contact Us' },
  ];

  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const top = el.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top, left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const hashId = decodeURIComponent(String(window.location.hash || '').replace(/^#/, ''));
    if (!hashId) return;

    const exists = sections.some((s) => s.id === hashId);
    if (!exists) return;

    setActiveId(hashId);
    setTimeout(() => {
      scrollToId(hashId);
    }, 0);
  }, []);

  useEffect(() => {
    const idsKey = sections.map((s) => s.id).join('|');
    void idsKey;

    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;

    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

        const topVisible = visible[0]?.target as HTMLElement | undefined;
        if (topVisible?.id) setActiveId(topVisible.id);
      },
      {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: [0, 0.1, 0.25, 0.4, 0.6, 0.8, 1],
      }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="terms-v1">
  
      <section className="terms-v1__section">
        <div className="container">
          <div className="terms-v1__grid">
            <aside className="terms-v1__aside" aria-label="Table of contents">
              <div className="terms-v1__toc">
                <div className="terms-v1__tocTitle">On this page</div>
                <nav className="terms-v1__tocLinks">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`terms-v1__tocLink ${activeId === s.id ? 'terms-v1__tocLink--active' : ''}`}
                      aria-current={activeId === s.id ? 'location' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveId(s.id);
                        if (window.location.hash !== `#${s.id}`) window.history.replaceState(null, '', `#${s.id}`);
                        scrollToId(s.id);
                      }}
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <main className="terms-v1__content" aria-label="Terms and conditions content">
              <article className="terms-v1__card">
                <section id="acceptance-of-terms" className="terms-v1__block">
                  <h2>1. Acceptance of Terms</h2>
                  <p>
                    By registering, browsing, or using Findtern’s website and services, you agree to be bound by these Terms and Conditions, as well as our Privacy Policy. If you do not agree, please do not use our platform.
                  </p>
                </section>

                <section id="user-registration-account-security" className="terms-v1__block">
                  <h2>2. User Registration & Account Security</h2>

                  <h3>2.1 Account Creation</h3>
                  <ul>
                    <li>To access Findtern, you must register with a valid email ID and phone number.</li>
                    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                  </ul>

                  <h3>2.2 Email & Phone Verification</h3>
                  <ul>
                    <li>Upon registration, you will receive a verification link via email and an OTP via SMS to confirm your identity.</li>
                    <li>If the verification is not completed, access to certain features may be restricted.</li>
                  </ul>
                </section>

                <section id="collection-use-of-personal-data" className="terms-v1__block">
                  <h2>3. Collection & Use of Personal Data</h2>

                  <h3>3.1 Information We Collect</h3>
                  <p>By using Findtern, you agree that we may collect and store:</p>
                  <ul>
                    <li><strong>Personal Information</strong> – Name, email, phone number, academic details, resume, and employment history.</li>
                    <li><strong>Usage Data</strong> – Your activity on the platform, including searches, job applications, and messages.</li>
                  </ul>

                  <h3>3.2 How We Use Your Data</h3>
                  <p>Your data is collected to:</p>
                  <ul>
                    <li>Match you with relevant internships based on your skills and preferences.</li>
                    <li>Allow employers to view your profile and contact you for opportunities.</li>
                    <li>Improve our platform experience and offer better recommendations.</li>
                  </ul>

                  <h3>3.3 Data Security</h3>
                  <p>
                    We implement strict security measures to protect your personal information. However, you acknowledge that no system is completely secure, and we cannot guarantee absolute data protection.
                  </p>
                </section>

                <section id="platform-usage-guidelines" className="terms-v1__block">
                  <h2>4. Platform Usage & Guidelines</h2>

                  <h3>4.1 For Interns</h3>
                  <ul>
                    <li>You must provide accurate academic and skill-related information.</li>
                    <li>Misrepresentation of skills or submitting fake documents will result in account termination.</li>
                    <li>Findtern reserves the right to verify academic credentials and remove any fraudulent profiles.</li>
                    <li>Findtern does not guarantee an internship. However, if your profile score is above 60%, you are eligible for a paid internship. This means that any internship you get through Findtern will be a paid one.</li>
                    <li>Internship stipends may vary between ₹5,000 – ₹12,000 per month. If you are selected on an hourly basis, payment will be calculated on a pro-rata basis.</li>
                  </ul>

                  <h3>4.2 For Employers</h3>
                  <ul>
                    <li>Employers must not misuse candidate data for any purpose other than hiring.</li>
                    <li>Contacting candidates for purposes outside of internship/job hiring is strictly prohibited.</li>
                    <li>Both parties – Clients and Candidates – are strictly prohibited from sharing their personal information or direct contact details outside of Findtern’s platform. Any violation of this may lead to legal action.</li>
                  </ul>
                </section>

                <section id="payment-refund-policy" className="terms-v1__block">
                  <h2>5. Payment & Refund Policy</h2>

                  <h3>5.1 Registration Fee for Interns</h3>
                  <ul>
                    <li>Findtern guarantees every registered candidate an internship within 18 months of completing their AI interview.</li>
                    <li>If we are unable to provide an internship within this period, the registration fee will be refunded in full.</li>
                    <li>Refunds will be processed only after the 18-month lock-in period is completed.</li>
                    <li>Placement opportunities are based on your AI interview performance and skill ratings. Stipends vary according to your Findtern score.</li>
                  </ul>

                  <h3>5.2 Employer Pricing</h3>
                  <ul>
                    <li>Employers agree to pay based on the selected pricing plan.</li>
                    <li>Payments made for hiring an intern are non-refundable once the hiring process is completed.</li>
                  </ul>
                </section>

                <section id="data-sharing-privacy" className="terms-v1__block">
                  <h2>6. Data Sharing & Privacy</h2>

                  <h3>6.1 Who Can Access Your Data?</h3>
                  <ul>
                    <li>Your profile (excluding phone number and email) is visible to verified employers on Findtern.</li>
                    <li>We do not sell or share your data with third parties for marketing purposes.</li>
                  </ul>

                  <h3>6.2 Communication from Findtern</h3>
                  <p>By signing up, you agree to receive:</p>
                  <ul>
                    <li>Emails & SMS notifications regarding job applications, internships, and account activity.</li>
                    <li>Promotional updates about new opportunities and platform improvements (you can opt-out anytime).</li>
                  </ul>
                </section>

                <section id="account-suspension-termination" className="terms-v1__block">
                  <h2>7. Account Suspension & Termination</h2>
                  <p>Findtern reserves the right to suspend or delete accounts in case of:</p>
                  <ul>
                    <li>Providing false information (e.g., fake certificates or fraudulent activities).</li>
                    <li>Violation of platform rules (e.g., harassment, misuse of data).</li>
                    <li>Non-compliance with these Terms & Conditions.</li>
                  </ul>
                </section>

                <section id="conversion-fee" className="terms-v1__block">
                  <h2>8. Internship to Full-Time Conversion Fee</h2>
                  <p>
                    If a candidate is hired by any client as an intern and later converted into a full-time employee, the client may be required to pay Findtern 8.33% of the offered CTC before the candidate joins as a full-time employee. Failure to comply may lead to legal action.
                  </p>
                </section>

                <section id="changes-to-terms" className="terms-v1__block">
                  <h2>9. Changes to Terms & Conditions</h2>
                  <p>
                    We may update these Terms & Conditions from time to time. Continued use of Findtern after any changes implies your acceptance of the revised terms.
                  </p>
                </section>

                <section id="contact-us" className="terms-v1__block">
                  <h2>10. Contact Us</h2>
                  <p>For any questions about these Terms & Conditions, please reach out to us at:</p>
                  <p>
                    <strong>For Inquiries:</strong>{' '}
                    <a className="terms-v1__link" href="mailto:admin@findtern.in">admin@findtern.in</a>
                  </p>
                </section>
              </article>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
