"use client";

import { useSyncExternalStore } from "react";
import { shouldPlayHeroVideo } from "@/lib/hero-video";

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

function canPlay(): boolean {
  return shouldPlayHeroVideo({
    hasVideo: true,
    viewportWidth: window.innerWidth,
    saveData: Boolean((navigator as NavigatorWithConnection).connection?.saveData),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

/**
 * Plays the hero loop only on wide screens without Save-Data and without reduced motion.
 * In every other case (and on the server) nothing is rendered and the poster behind it shows.
 */
export function HeroMedia({ src, poster }: { src: string; poster?: string }) {
  const play = useSyncExternalStore(subscribe, canPlay, () => false);
  if (!play) return null;
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
