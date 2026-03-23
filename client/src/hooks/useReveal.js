import { useEffect } from 'react';

export default function useReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('.reveal'));
    if (!elements.length) return;

    const staggerGroups = Array.from(document.querySelectorAll('.reveal-stagger'));
    staggerGroups.forEach((group) => {
      Array.from(group.children).forEach((child, idx) => {
        child.style.setProperty('--reveal-i', String(idx));
      });
    });

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');

            if (entry.target.classList.contains('reveal-stagger')) {
              Array.from(entry.target.children).forEach((child) => child.classList.add('is-visible'));
            }

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    staggerGroups.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
