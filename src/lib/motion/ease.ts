// The house motion language: slow, smooth, ease-out. Nothing bounces.
// Shared by every animated surface so the landing journey and the shop feel
// like one hand made them.

export const EASE_HOUSE = [0.22, 1, 0.36, 1] as const;
export const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;

export const DURATION = {
  quick: 0.35,
  base: 0.8,
  reveal: 1.1,
} as const;

export const SPRING_SOFT = { stiffness: 120, damping: 20, mass: 0.6 } as const;
