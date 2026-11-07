// Scene lengths in frames (30 fps). 80 seconds in total.
export const LEN = {
  title: 120,
  landing: 180,
  form: 420,
  generate: 210,
  itinerary: 540,
  stays: 180,
  save: 270,
  news: 330,
  close: 150,
} as const;

export const WALKTHROUGH_FRAMES = Object.values(LEN).reduce((a, b) => a + b, 0);
