"use client";

import { useEffect } from "react";

/**
 * Mounted once in the root layout. Adds `.is-visible` to `.reveal` elements and `[data-reveal]`
 * image wrappers when they scroll into view. The CSS keeps content visible without JavaScript
 * and under prefers-reduced-motion.
 */
export function RevealObserver() {
  useEffect(() => {
    const selector = ".reveal:not(.is-visible), [data-reveal]:not(.is-visible)";
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(selector).forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const observeAll = () => document.querySelectorAll(selector).forEach((el) => io.observe(el));
    observeAll();
    // Pages change on client navigation; watch for new content.
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
