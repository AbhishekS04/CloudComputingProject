import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import barba from '@barba/core';

function setRouteTransitionState(state) {
  if (typeof window === 'undefined') return;
  window.__routeTransitionActive = state !== 'idle';
  window.dispatchEvent(new CustomEvent('route-transition-state', { detail: { state } }));
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function getNamespaceFromPath(pathname) {
  const clean = (pathname || '/').replace(/^\/+|\/+$/g, '');
  return clean || 'home';
}

function clearContainerStyles(el) {
  if (!el) return;
  el.style.opacity = '';
  el.style.transform = '';
  el.style.filter = '';
  el.style.willChange = '';
}

function resolveInternalAnchor(target) {
  if (!target || typeof target.closest !== 'function') return null;

  const anchor = target.closest('a[href]');
  if (!anchor) return null;
  if (anchor.hasAttribute('download')) return null;
  if (anchor.hasAttribute('data-barba-prevent') || anchor.closest('[data-barba-prevent]')) {
    return null;
  }

  const targetAttr = anchor.getAttribute('target');
  if (targetAttr && targetAttr !== '_self') return null;

  const rawHref = anchor.getAttribute('href');
  if (
    !rawHref ||
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:') ||
    rawHref.startsWith('javascript:')
  ) {
    return null;
  }

  try {
    const resolvedUrl = new URL(anchor.href, window.location.href);
    if (resolvedUrl.origin !== window.location.origin) return null;
    return { anchor, resolvedUrl };
  } catch {
    return null;
  }
}

function animateElement(el, keyframes, options, activeAnimRef) {
  if (!el) return Promise.resolve(null);
  if (typeof el.animate === 'function') {
    if (activeAnimRef?.current) {
      try {
        activeAnimRef.current.cancel();
      } catch {}
    }
    const anim = el.animate(keyframes, options);
    if (activeAnimRef) activeAnimRef.current = anim;
    return anim.finished.then(() => anim).catch(() => anim);
  }
  return new Promise((resolve) => setTimeout(() => resolve(null), options.duration || 0));
}

export function BarbaPageTransition({ navigate, preloadRoute, header = null, children }) {
  const location = useLocation();
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const transitionsRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const pendingNavRef = useRef(null);
  const activeAnimRef = useRef(null);
  const prevPathRef = useRef(`${location.pathname}${location.search}`);
  const runIdRef = useRef(0);

  useEffect(() => {
    setRouteTransitionState('idle');

    if (!wrapperRef.current || !containerRef.current) return undefined;

    const barbaTransitionsConfig = [
      {
        name: 'barba-smooth-fade',
        leave({ current }) {
          if (prefersReducedMotion()) return Promise.resolve();
          const el = current?.container;
          if (!el) return Promise.resolve();

          el.style.willChange = 'opacity, transform';
          return animateElement(
            el,
            [
              { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
              { opacity: 0, transform: 'translate3d(0, -8px, 0)' },
            ],
            { duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
            activeAnimRef
          );
        },
        enter({ next }) {
          const el = next?.container;
          if (!el) return Promise.resolve();
          if (prefersReducedMotion()) {
            clearContainerStyles(el);
            return Promise.resolve();
          }

          el.style.willChange = 'opacity, transform';
          return animateElement(
            el,
            [
              { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
              { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
            ],
            { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
            activeAnimRef
          ).then((anim) => {
            if (anim) {
              try {
                anim.cancel();
              } catch {}
            }
            if (activeAnimRef.current === anim) {
              activeAnimRef.current = null;
            }
            clearContainerStyles(el);
          });
        },
      },
    ];

    try {
      barba.init({
        prevent: () => true,
        prefetchIgnore: true,
        transitions: barbaTransitionsConfig,
      });
      transitionsRef.current = barba.transitions;
      // Keep Barba's transitions & hooks engine active while React Router manages route matching
      barba.destroy();
      barba.hooks.init();
    } catch {
      transitionsRef.current = null;
    }

    return () => {
      setRouteTransitionState('idle');
    };
  }, []);

  // Warm lazy route chunks on idle so navbar transitions never show a Suspense loading screen
  useEffect(() => {
    if (!preloadRoute) return undefined;
    const warmAll = () => {
      preloadRoute('/monitoring');
      preloadRoute('/about');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warmAll, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(warmAll, 500);
    return () => clearTimeout(timer);
  }, [preloadRoute]);

  useEffect(() => {
    const handlePrefetch = (event) => {
      if (!preloadRoute) return;
      const hit = resolveInternalAnchor(event.target);
      if (!hit) return;
      preloadRoute(hit.resolvedUrl.pathname);
    };

    const handleLinkClick = async (event) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      const hit = resolveInternalAnchor(event.target);
      if (!hit) return;
      const { anchor, resolvedUrl } = hit;

      const nextPath = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();

      if (isTransitioningRef.current) return;

      const preloadPromise = preloadRoute
        ? Promise.resolve(preloadRoute(resolvedUrl.pathname)).catch(() => {})
        : Promise.resolve();

      const container = containerRef.current;
      const engine = transitionsRef.current;

      if (prefersReducedMotion() || !container || !engine) {
        await preloadPromise;
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate(nextPath);
        return;
      }

      const activeRunId = ++runIdRef.current;
      isTransitioningRef.current = true;
      engine.isRunning = true;
      setRouteTransitionState('leaving');

      const data = {
        trigger: anchor,
        event,
        current: {
          container,
          namespace: getNamespaceFromPath(window.location.pathname),
          url: { href: window.location.href, ...barba.url.parse(window.location.href) },
        },
        next: {
          container,
          namespace: getNamespaceFromPath(resolvedUrl.pathname),
          url: { href: resolvedUrl.href, ...barba.url.parse(resolvedUrl.href) },
        },
      };

      const transition = engine.get(data) || {};

      try {
        await barba.hooks.do('before', data);
        await barba.hooks.do('beforeLeave', data);
        // Load destination route chunk in parallel with leave animation so React swaps seamlessly without a blank fallback
        await Promise.all([engine.leave(data, transition), preloadPromise]);
        await barba.hooks.do('afterLeave', data);
      } catch {
        await preloadPromise;
      }

      if (runIdRef.current !== activeRunId) return;

      container.style.opacity = '0';
      pendingNavRef.current = { data, transition, activeRunId };

      window.scrollTo({ top: 0, behavior: 'instant' });
      navigate(nextPath);
    };

    document.addEventListener('mouseover', handlePrefetch, { passive: true });
    document.addEventListener('focusin', handlePrefetch, { passive: true });
    document.addEventListener('touchstart', handlePrefetch, { passive: true });
    document.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
      document.removeEventListener('mouseover', handlePrefetch);
      document.removeEventListener('focusin', handlePrefetch);
      document.removeEventListener('touchstart', handlePrefetch);
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [navigate, preloadRoute]);

  useLayoutEffect(() => {
    const fullPath = `${location.pathname}${location.search}`;
    if (prevPathRef.current === fullPath && !pendingNavRef.current) {
      return;
    }
    prevPathRef.current = fullPath;

    const container = containerRef.current;
    const engine = transitionsRef.current;
    const pending = pendingNavRef.current;
    pendingNavRef.current = null;

    if (!container || !engine || prefersReducedMotion()) {
      if (activeAnimRef.current) {
        try {
          activeAnimRef.current.cancel();
        } catch {}
        activeAnimRef.current = null;
      }
      clearContainerStyles(container);
      if (engine) engine.isRunning = false;
      isTransitioningRef.current = false;
      setRouteTransitionState('idle');
      return;
    }

    const activeRunId = pending ? pending.activeRunId : ++runIdRef.current;
    const data = pending?.data || {
      trigger: 'popstate',
      current: {
        container,
        namespace: getNamespaceFromPath(location.pathname),
        url: { href: window.location.href, ...barba.url.parse(window.location.href) },
      },
      next: {
        container,
        namespace: getNamespaceFromPath(location.pathname),
        url: { href: window.location.href, ...barba.url.parse(window.location.href) },
      },
    };
    data.next.container = container;
    const transition = pending?.transition || engine.get(data) || {};

    let cancelled = false;

    const runEnter = async () => {
      if (!pending) {
        isTransitioningRef.current = true;
        engine.isRunning = true;
        setRouteTransitionState('entering');
      }

      try {
        await barba.hooks.do('beforeEnter', data);
        await engine.enter(data, transition);
        await barba.hooks.do('afterEnter', data);
        await barba.hooks.do('after', data);
      } catch {
        // Fallback cleanup below
      }

      if (cancelled || runIdRef.current !== activeRunId) return;
      if (activeAnimRef.current) {
        try {
          activeAnimRef.current.cancel();
        } catch {}
        activeAnimRef.current = null;
      }
      clearContainerStyles(container);
      engine.isRunning = false;
      isTransitioningRef.current = false;
      setRouteTransitionState('idle');
    };

    runEnter();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  return (
    <div
      ref={wrapperRef}
      data-barba="wrapper"
      className="flex flex-col min-h-screen w-full bg-[#FAF7F0] dark:bg-[#121212] transition-colors duration-200"
    >
      {/* Persistent chrome stays outside Barba's animated container */}
      {header}

      <div
        ref={containerRef}
        data-barba="container"
        data-barba-namespace={getNamespaceFromPath(location.pathname)}
        className="flex-1 flex flex-col w-full"
      >
        {children}
      </div>
    </div>
  );
}

export default BarbaPageTransition;
