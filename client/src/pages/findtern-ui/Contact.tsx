import React, { useId, useMemo, useState } from 'react';
import { countryCodes } from '../../lib/countryCodes';
import CountrySelect from '../../components/ui/country-select';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaUser, FaTag, FaRegCommentDots, FaPaperPlane, FaBriefcase, FaUserGraduate } from 'react-icons/fa';

export default function Contact() {
  const formId = useId();
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    queryType: 'general',
    subject: '',
    message: '',
  });

  const ids = useMemo(
    () => ({
      firstName: `${formId}-firstName`,
      lastName: `${formId}-lastName`,
      email: `${formId}-email`,
      countryCode: `${formId}-countryCode`,
      phone: `${formId}-phone`,
      queryType: `${formId}-queryType`,
      subject: `${formId}-subject`,
      message: `${formId}-message`,
    }),
    [formId]
  );

  const freeEmailDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','protonmail.com','icloud.com','yandex.com','live.com'];
  const workEmailError = 'Please use your work email for hiring partner inquiries.';

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    setForm((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => {
      // remove error for this field if present
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });

    const nextForm = { ...form, [name]: value } as typeof form;
    if ((name === 'email' || name === 'queryType') && nextForm.queryType === 'hiring') {
      const domain = nextForm.email.trim().toLowerCase().split('@')[1] || '';
      if (domain && freeEmailDomains.includes(domain)) {
        setErrors((prev) => ({ ...prev, email: workEmailError }));
      }
    }

    if (name === 'queryType' && value !== 'hiring') {
      setErrors((prev) => {
        if (prev.email !== workEmailError) return prev;
        const { email: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email.';
    if (!form.message.trim()) nextErrors.message = 'Please write a short message.';

    if ((form as any).queryType === 'hiring' && !nextErrors.email) {
      const domain = form.email.trim().toLowerCase().split('@')[1] || '';
      if (domain && freeEmailDomains.includes(domain)) nextErrors.email = workEmailError;
    }



    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('error');
      return;
    }

    setStatus('sending');
    fetch('/api/website/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        countryCode: (form as any).countryCode || null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        queryType: (form as any).queryType || null,
        subject: form.subject.trim() ? form.subject.trim() : null,
        message: form.message.trim(),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = 'Failed to send message. Please try again.';
          try {
            const json = await res.json();
            if (json?.message) msg = String(json.message);
          } catch {
            // ignore
          }
          throw new Error(msg);
        }
        return res.json();
      })
      .then(() => {
        setStatus('success');
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          countryCode: '+91',
          phone: '',
          queryType: 'general',
          subject: '',
          message: '',
        });
      })
      .catch(() => {
        setStatus('error');
      });
  };

  return (
    <div className="contact-v5">
      <section className="contact-hero-v2">
        <div className="contact-hero-v2__bg" aria-hidden="true"></div>
        <div className="container contact-hero-v2__inner">
          <div className="contact-hero-v2__content reveal reveal--up is-visible">
            <h1>Contact Us</h1>
            <p>Have a question or need assistance? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          </div>
        </div>
      </section>
    

      <section className="contact-v5__section">
        <div className="container">
          <div className="contact-v5__grid">
            <aside className="contact-v5__aside" aria-label="Contact information">
              <div className="contact-v5__asideCard">
                <h2 className="contact-v5__asideTitle">Get in Touch</h2>
                <div className="contact-v5__infoList">
                  <a className="contact-v5__infoItem" href="mailto:admin@findtern.in">
                    <span className="contact-v5__infoIcon" aria-hidden="true">
                      <FaEnvelope aria-hidden="true" />
                    </span>
                    <span>
                      <span className="contact-v5__infoLabel">Email</span>
                      <span className="contact-v5__infoValue">admin@findtern.in</span>
                    </span>
                  </a>

                 
                  <div className="contact-v5__infoItem contact-v5__infoItem--static">
                    <span className="contact-v5__infoIcon" aria-hidden="true">
                      <FaMapMarkerAlt aria-hidden="true" />
                    </span>
                    <span>
                      <span className="contact-v5__infoLabel">Address</span>
                      <span className="contact-v5__infoValue contact-v5__muted">
                        Jaipur, Rajasthan, India
                      </span>
                    </span>
                  </div>

                  <div className="contact-v5__infoItem contact-v5__infoItem--static">
                    <span className="contact-v5__infoIcon" aria-hidden="true">
                      <FaClock aria-hidden="true" />
                    </span>
                    <span>
                      <span className="contact-v5__infoLabel">Business Hours</span>
                      <span className="contact-v5__infoValue contact-v5__muted">
                        Monday – Friday: 9:00 AM – 7:00 PM
                      </span>
                      <span className="contact-v5__infoValue contact-v5__muted">
                        Saturday – Sunday: Closed
                      </span>
                    </span>
                  </div>
                </div>

                <div className="contact-v5__mapFrame" aria-label="Findtern Jaipur location">
                  <iframe
                    title="Findtern location - Jaipur"
                    src="https://www.google.com/maps?q=Jaipur,+Rajasthan,+India&output=embed"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            </aside>

            <div className="contact-v5__panel">
              <form className="contact-v5__form" onSubmit={onSubmit} aria-describedby={status === 'success' ? `${formId}-status` : undefined}>
                <div className="contact-v5__formHead">
                  <div className="contact-v5__formTitle">Send us a Message</div>
                </div>

                {status === 'success' && (
                  <div id={`${formId}-status`} className="contact-v5__notice" role="status">
                    Thanks! Your message has been sent successfully.
                  </div>
                )}

                {status === 'error' && (
                  <div className="contact-v5__notice contact-v5__notice--error" role="alert">
                    Something went wrong. Please check the form and try again.
                  </div>
                )}

                {status === 'sending' && (
                  <div className="contact-v5__notice" role="status">
                    Sending...
                  </div>
                )}

                {errors.email === workEmailError && (
                  <div className="contact-v5__notice contact-v5__notice--error" role="alert">
                    {workEmailError}
                  </div>
                )}

                <div className="contact-v5__fields">
                  <div className="contact-v5__field">
                    <label htmlFor={ids.firstName} className="contact-v5__label">
                      First Name <span className="contact-v5__required">*</span>
                    </label>
                    <div className={`contact-v5__inputWrap ${errors.firstName ? 'contact-v5__inputWrap--error' : ''}`}> 
                      <span className="contact-v5__inputIcon" aria-hidden="true">
                        <FaUser aria-hidden="true" />
                      </span>
                      <input
                        id={ids.firstName}
                        className="contact-v5__input"
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={onChange}
                        autoComplete="given-name"
                        aria-invalid={errors.firstName ? 'true' : 'false'}
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <div className="contact-v5__error" role="alert">
                        {errors.firstName}
                      </div>
                    )}
                  </div>

                  <div className="contact-v5__field">
                    <label htmlFor={ids.lastName} className="contact-v5__label">
                      Last Name <span className="contact-v5__required">*</span>
                    </label>
                    <div className={`contact-v5__inputWrap ${errors.lastName ? 'contact-v5__inputWrap--error' : ''}`}> 
                      <span className="contact-v5__inputIcon" aria-hidden="true">
                        <FaUser aria-hidden="true" />
                      </span>
                      <input
                        id={ids.lastName}
                        className="contact-v5__input"
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={onChange}
                        autoComplete="family-name"
                        aria-invalid={errors.lastName ? 'true' : 'false'}
                        required
                      />
                    </div>
                    {errors.lastName && (
                      <div className="contact-v5__error" role="alert">
                        {errors.lastName}
                      </div>
                    )}
                  </div>
                  <div className="contact-v5__field">
                    <label htmlFor={ids.queryType} className="contact-v5__label">
                      Query Type
                    </label>
                    <div className={`contact-v5__inputWrap ${(form as any).queryType === 'hiring' ? 'contact-v5__inputWrap--success' : ''}`}>
                      <span className="contact-v5__inputIcon" aria-hidden="true">
                        {(form as any).queryType === 'intern' ? <FaUserGraduate aria-hidden="true" /> : (form as any).queryType === 'hiring' ? <FaBriefcase aria-hidden="true" /> : <FaRegCommentDots aria-hidden="true" />}
                      </span>

                      <select
                        id={ids.queryType}
                        name="queryType"
                        className="contact-v5__input"
                        value={(form as any).queryType}
                        onChange={onChange as any}
                        aria-label="Query type"
                      >
                        <option value="intern">Intern query</option>
                        <option value="general">General query</option>
                        <option value="hiring">Hiring partner</option>
                      </select>
                    </div>
                  </div>
                  <div className="contact-v5__field">
                    <label htmlFor={ids.email} className="contact-v5__label">
                      Email Address <span className="contact-v5__required">*</span>
                    </label>
                    <div className={`contact-v5__inputWrap ${errors.email ? 'contact-v5__inputWrap--error' : ''}`}>
                      <span className="contact-v5__inputIcon" aria-hidden="true">
                        <FaEnvelope aria-hidden="true" />
                      </span>
                      <input
                        id={ids.email}
                        className="contact-v5__input"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        autoComplete="email"
                        placeholder="you@company.com"
                        aria-invalid={errors.email ? 'true' : 'false'}
                        required
                      />
                    </div>
                    {errors.email && errors.email !== workEmailError && (
                      <div className="contact-v5__error" role="alert">
                        {errors.email}
                      </div>
                    )}
                  </div>

                  <div className="contact-v5__field">
                    <label htmlFor={ids.phone} className="contact-v5__label">
                      Phone Number
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: '0 0 140px' }}>
                        <label className="contact-v5__label" style={{ display: 'none' }} htmlFor={ids.countryCode}>Country code</label>
                        <CountrySelect
                          id={ids.countryCode}
                          name="countryCode"
                          value={(form as any).countryCode}
                          onChange={(v) => setForm((p) => ({ ...p, countryCode: v }))}
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div className="contact-v5__inputWrap">
                          <span className="contact-v5__inputIcon" aria-hidden="true">
                            <FaPhone aria-hidden="true" />
                          </span>
                          <input
                            id={ids.phone}
                            className="contact-v5__input"
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={onChange}
                            autoComplete="tel"
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="contact-v5__field">
                    <label htmlFor={ids.subject} className="contact-v5__label">
                      Subject
                    </label>
                    <div className="contact-v5__inputWrap">
                      <span className="contact-v5__inputIcon" aria-hidden="true">
                        <FaTag aria-hidden="true" />
                      </span>
                      <input
                        id={ids.subject}
                        className="contact-v5__input"
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={onChange}
                        placeholder="Brief description of your inquiry"
                      />
                    </div>
                  </div>
                </div>

                

                <div className="contact-v5__field">
                  <label htmlFor={ids.message} className="contact-v5__label">
                    Message <span className="contact-v5__required">*</span>
                  </label>
                  <div className={`contact-v5__inputWrap ${errors.message ? 'contact-v5__inputWrap--error' : ''}`}> 
                    <span className="contact-v5__inputIcon contact-v5__inputIcon--textarea" aria-hidden="true">
                      <FaRegCommentDots aria-hidden="true" />
                    </span>
                    <textarea
                      id={ids.message}
                      className="contact-v5__input contact-v5__textarea"
                      name="message"
                      value={form.message}
                      onChange={onChange}
                      rows={5}
                      placeholder="Tell us a bit more..."
                      aria-invalid={errors.message ? 'true' : 'false'}
                      required
                    />
                  </div>
                  {errors.message && (
                    <div className="contact-v5__error" role="alert">
                      {errors.message}
                    </div>
                  )}
                </div>

                <div className="contact-v5__actions">
                  <button type="submit" className="contact-v5__submit" disabled={status === 'sending'}>
                    <FaPaperPlane aria-hidden="true" />
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
