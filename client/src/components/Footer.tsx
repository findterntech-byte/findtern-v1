import React from 'react';
import { Link } from 'wouter';
import newlogo from '@assets/logo-remove.png';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter } from 'react-icons/fa';

export default function Footer() {
  const handleFooterNavClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <div className="site-footer__logo">
              <img className="site-footer__logoImg" src={newlogo} alt="Findtern" />
            </div> 
            <p className="site-footer__tagline">
              Your gateway to skilled interns, effortlessly. Hire pre-vetted interns at unbeatable prices and build your future workforce today!
            </p>
           
          </div>

          <div className="site-footer__col">
            <h4>Quick Links</h4>
            <ul className="site-footer__links">
              <li><Link href="/" onClick={handleFooterNavClick}>Home</Link></li>
              <li><Link href="/about" onClick={handleFooterNavClick}>About</Link></li>
              <li><Link href="/contact" onClick={handleFooterNavClick}>Contact Us</Link></li>
              <li><Link href="/faq" onClick={handleFooterNavClick}>FAQ</Link></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4>Legal Links</h4>
            <ul className="site-footer__links">
              <li><Link href="/terms-and-conditions" onClick={handleFooterNavClick}>Terms and Conditions</Link></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4>Resources</h4>
            <ul className="site-footer__links">
              <li><Link href="/blog" onClick={handleFooterNavClick}>Blog</Link></li>
              <li><Link href="/pricing" onClick={handleFooterNavClick}>Pricing</Link></li>
            </ul>
            
          </div>
         
        </div>
        <div className="">
           <div className="site-footer__social">
              <a href="https://www.facebook.com/people/Findtern/61579381094708/" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF aria-hidden="true" /></a>
              <a href="https://www.instagram.com/findtern.in/" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram aria-hidden="true" /></a>
              <a href="https://x.com/Findtern" target="_blank" rel="noreferrer" aria-label="X"><FaTwitter aria-hidden="true" /></a>
              <a href="https://www.linkedin.com/company/findtern-in/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><FaLinkedinIn aria-hidden="true" /></a>
            </div>
        </div>

        <div className="site-footer__bottom">
          <span>2026 @ FINDTERN. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
