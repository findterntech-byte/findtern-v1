import { useEffect } from 'react';

export default function useTilt() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.tilt-3d'));
    if (!els.length) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const cleanupFns = [];

    els.forEach((el) => {
      const max = Number(el.getAttribute('data-tilt-max') || 10);
      const perspective = Number(el.getAttribute('data-tilt-perspective') || 900);

      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotY = (x - 0.5) * (max * 2);
        const rotX = (0.5 - y) * (max * 2);
        el.style.transform = `perspective(${perspective}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-2px)`;
      };

      const onLeave = () => {
        el.style.transform = '';
      };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);

      cleanupFns.push(() => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanupFns.forEach((fn) => fn());
  }, []);
}
