import React, { Suspense, useEffect, useRef, useState } from 'react';

// Lightweight global reveal queue so at most one section starts hydrating per frame window,
// preventing simultaneous chart mounts and sweep animations from causing scroll jitter.
let activeQueueChain = Promise.resolve();

function scheduleSequentialSlot(delayMs, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      activeQueueChain = activeQueueChain.then(
        () =>
          new Promise((stepDone) => {
            if (signal.aborted) {
              stepDone();
              return;
            }
            requestAnimationFrame(() => {
              resolve();
              setTimeout(stepDone, 110);
            });
          })
      );
    }, delayMs);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
      },
      { once: true }
    );
  });
}

/**
 * Viewport-aware sequential lazy section gate for the Monitoring Dashboard.
 * 1. Waits until any active page transition finishes.
 * 2. Defers mounting heavy off-screen charts until scrolled near the viewport.
 * 3. Serializes section hydration so only 1-2 cards mount & sweep at a time.
 */
export default function LazyTelemetrySection({
  routeSettled = true,
  syncKey = 0,
  delayMs = 160,
  minHeight = 320,
  rootMargin = '60px 0px',
  eager = false,
  className = '',
  children,
}) {
  const hostRef = useRef(null);
  const [inView, setInView] = useState(eager);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (eager) {
      setInView(true);
      return;
    }
    if (inView) return;

    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, inView, rootMargin]);

  useEffect(() => {
    setDataReady(false);
    if (!routeSettled || !inView) return;

    const controller = new AbortController();
    scheduleSequentialSlot(delayMs, controller.signal).then(() => {
      if (!controller.signal.aborted) {
        setDataReady(true);
      }
    });

    return () => {
      controller.abort();
    };
  }, [routeSettled, inView, syncKey, delayMs]);

  const placeholderShell = (
    <div
      style={{ minHeight }}
      className="w-full flex-1 rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#14161b]/70 p-5 sm:p-6 flex flex-col justify-between"
      aria-hidden="true"
    >
      <div className="space-y-3">
        <div className="h-3.5 w-44 rounded-md bg-black/[0.06] dark:bg-white/[0.08]" />
        <div className="h-2.5 w-64 rounded-md bg-black/[0.04] dark:bg-white/[0.05]" />
      </div>
      <div className="flex-1 my-5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]" />
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-28 rounded-md bg-black/[0.05] dark:bg-white/[0.06]" />
        <div className="h-2.5 w-20 rounded-md bg-black/[0.05] dark:bg-white/[0.06]" />
      </div>
    </div>
  );

  return (
    <div ref={hostRef} className={className}>
      {inView ? (
        <Suspense fallback={placeholderShell}>
          {children({ ready: routeSettled && dataReady, mounted: true })}
        </Suspense>
      ) : (
        placeholderShell
      )}
    </div>
  );
}
