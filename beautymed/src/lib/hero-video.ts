export type HeroVideoInput = {
  hasVideo: boolean;
  viewportWidth: number;
  saveData: boolean;
  reducedMotion: boolean;
};

export const HERO_VIDEO_MIN_WIDTH = 1024;

/** The hero plays its video only on wide screens, without Save-Data and without reduced motion. */
export function shouldPlayHeroVideo({ hasVideo, viewportWidth, saveData, reducedMotion }: HeroVideoInput): boolean {
  return hasVideo && viewportWidth >= HERO_VIDEO_MIN_WIDTH && !saveData && !reducedMotion;
}
