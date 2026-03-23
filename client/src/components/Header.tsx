import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import './Header.css';
import logo from '@assets/logo.png';
import { Building2, GraduationCap, UserCircle2 } from 'lucide-react';


export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
  const [location] = useLocation();
  const loginMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1025) setIsMenuOpen(false);
      setIsLoginMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    if (isMenuOpen) body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsLoginMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isLoginMenuOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inside = Boolean(loginMenuRef.current?.contains(target));
      if (!inside) setIsLoginMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isLoginMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsLoginMenuOpen(false);
  };

  const onLoginMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsLoginMenuOpen(false);
    }
  };

  const navLinkClass = (href: string) => `nav-link ${location === href ? 'active' : ''}`;

  return (
    <header className="header header-v2">
      <div className="container-fluid header-v2__inner">
        <Link href="/" className="logo" aria-label="Findtern Home">
          <img className="inner_logo__img" src={logo} alt="Findtern" />
        </Link>

        <nav
          id="primary-navigation"
          className={`header-v2__nav ${isMenuOpen ? 'active' : ''}`}
        >
          <div className="header-v2__navLinks">
            <Link href="/" onClick={closeMenu} className={navLinkClass("/")}>Home</Link>
            <Link href="/about" onClick={closeMenu} className={navLinkClass("/about")}>About</Link>
            <Link href="/pricing" onClick={closeMenu} className={navLinkClass("/pricing")}>Pricing</Link>
            <Link href="/blog" onClick={closeMenu} className={navLinkClass("/blog")}>Blog</Link>
            <Link href="/contact" onClick={closeMenu} className={navLinkClass("/contact")}>Contact Us</Link>
            <Link href="/faq" onClick={closeMenu} className={navLinkClass("/faq")}>FAQ</Link>
          </div>
          <div className="nav-buttons">
            <Link className="btn-employer btn btn-outline" href="/employers" onClick={closeMenu}>For Employers</Link>
            <Link className="btn-intern btn btn-primary" href="/interns" onClick={closeMenu}>For Interns</Link>
          </div>
        </nav>

        <div className="header-v2__actions">
          <div className="login-menu" ref={loginMenuRef}>
            <button
              type="button"
              className="login-menu__trigger"
              aria-label="Open login options"
              aria-haspopup="menu"
              aria-expanded={isLoginMenuOpen}
              onClick={() => setIsLoginMenuOpen((v) => !v)}
              onKeyDown={onLoginMenuKeyDown}
            >
              <UserCircle2 className="login-menu__icon" aria-hidden="true" />
              <span className="login-menu__triggerText">Login</span>
            </button>

            <div
              className={`login-menu__dropdown ${isLoginMenuOpen ? 'open' : ''}`}
              role="menu"
              onKeyDown={onLoginMenuKeyDown}
            >
              <Link href="/login" onClick={closeMenu} className="login-menu__item" role="menuitem">
                <GraduationCap className="login-menu__itemIcon" aria-hidden="true" />
                <span className="login-menu__itemText">Intern Login</span>
              </Link>
              <Link href="/employer/login" onClick={closeMenu} className="login-menu__item" role="menuitem">
                <Building2 className="login-menu__itemIcon" aria-hidden="true" />
                <span className="login-menu__itemText">Employer Login</span>
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="header-v2__toggle"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            <span className="header-v2__toggleBars" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
