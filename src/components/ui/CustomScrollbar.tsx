import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom overlay vertical scrollbar that replaces the default browser right-side scrollbar.
 * Supports smooth drag scrubbing and click-to-jump without taking layout width.
 */
export function CustomScrollbar() {
  const { pathname } = useLocation();
  const trackRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, startY: 0, startScrollTop: 0 });

  const [metrics, setMetrics] = useState({
    scrollable: false,
    thumbHeight: 40,
    thumbTop: 0,
  });
  const [isActive, setIsActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const measure = useCallback(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(doc.scrollHeight, body?.scrollHeight || 0);
    const viewportHeight = window.innerHeight;
    const maxScroll = scrollHeight - viewportHeight;

    if (maxScroll <= 4) {
      setMetrics((prev) => (prev.scrollable ? { scrollable: false, thumbHeight: 40, thumbTop: 0 } : prev));
      return;
    }

    const trackHeight = trackRef.current?.clientHeight || Math.max(120, viewportHeight - 88);
    const thumbHeight = Math.max(36, Math.min(trackHeight * 0.7, (viewportHeight / scrollHeight) * trackHeight));
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
    const thumbTop = ratio * Math.max(0, trackHeight - thumbHeight);

    setMetrics((prev) => {
      if (
        prev.scrollable &&
        Math.abs(prev.thumbHeight - thumbHeight) < 0.5 &&
        Math.abs(prev.thumbTop - thumbTop) < 0.5
      ) {
        return prev;
      }
      return { scrollable: true, thumbHeight, thumbTop };
    });
  }, []);

  useEffect(() => {
    let rafId = 0;
    const scheduleMeasure = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measure();
      });
    };

    const handleScroll = () => {
      scheduleMeasure();
      setIsActive(true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        if (!dragRef.current.active) setIsActive(false);
      }, 900);
    };

    measure();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', scheduleMeasure, { passive: true });

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', scheduleMeasure);
      ro.disconnect();
    };
  }, [pathname, measure]);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, (clickY - metrics.thumbHeight / 2) / Math.max(1, trackHeight - metrics.thumbHeight)));
    window.scrollTo({ top: ratio * maxScroll, behavior: 'smooth' });
  };

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startY: e.clientY,
      startScrollTop: window.scrollY || document.documentElement.scrollTop || 0,
    };
    setIsActive(true);
  };

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || !trackRef.current) return;
    const trackHeight = trackRef.current.clientHeight;
    const usableTrack = Math.max(1, trackHeight - metrics.thumbHeight);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const deltaY = e.clientY - dragRef.current.startY;
    const scrollDelta = (deltaY / usableTrack) * maxScroll;
    window.scrollTo({
      top: Math.min(maxScroll, Math.max(0, dragRef.current.startScrollTop + scrollDelta)),
      behavior: 'auto',
    });
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if capture already released
    }
    if (!isHovered) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setIsActive(false), 700);
    }
  };

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      onPointerDown={handleTrackPointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed right-1 sm:right-1.5 top-[72px] bottom-3 z-[70] w-2.5 sm:w-3 flex justify-end transition-opacity duration-300 pointer-events-none sm:pointer-events-auto ${
        metrics.scrollable
          ? isActive || isHovered
            ? 'opacity-75'
            : 'opacity-[0.16]'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
        onPointerCancel={handleThumbPointerUp}
        style={{
          height: `${metrics.thumbHeight}px`,
          transform: `translateY(${metrics.thumbTop}px)`,
        }}
        className={`rounded-full transition-[width,background-color] duration-150 cursor-grab active:cursor-grabbing ${
          isHovered || isActive ? 'w-[5px] sm:w-[6px]' : 'w-[3px] sm:w-[4px]'
        } bg-charcoal-800/35 hover:bg-charcoal-900/65 dark:bg-white/25 dark:hover:bg-white/55 shadow-2xs`}
      />
    </div>
  );
}
