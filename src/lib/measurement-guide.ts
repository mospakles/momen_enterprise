// The measurement guide: how each measurement is taken and where it sits on
// the mannequin, plus the resolver that turns a product's style into the
// garment pieces and fields a customer is asked for.
//
// WHICH fields a style needs is configuration, read in this order:
//   1. the product's own field list (Admin → Products → Measurements)
//   2. its category's field list (Admin → Categories), e.g. Agbada, Kaftans
//   3. every field enabled for the product's garment family
// HOW a field is taken (the copy below) can be overridden per field in
// Admin → Measurements; anything left blank there falls back to this guide.

import type { Category, Garment, MeasurementFieldDef, MeasurementUnit, MeasurementValues, Product } from "@/lib/types";

export type PieceId = "outer" | "top" | "trouser" | "other";
export type TapeDirection = "around" | "across" | "vertical" | "along";
export type MannequinView = "front" | "back";

/** Tape geometry in the front figure's pixel space of the reference image;
 * the back figure sits 548px to the right, so one set of numbers draws both. */
export type Placement = { views: MannequinView[] } & (
  | { kind: "around"; cx: number; cy: number; rx: number }
  | { kind: "line"; points: [number, number][]; curve?: boolean }
);

export interface GuideEntry {
  piece: PieceId;
  label: string;
  what: string;
  steps: string[];
  from: string;
  to: string;
  direction: TapeDirection;
  tips: string[];
  placement: Placement;
}

export const DIRECTION_LABEL: Record<TapeDirection, string> = {
  around: "Around the body",
  across: "Straight across the body",
  vertical: "Straight up and down",
  along: "Along the limb",
};

const BOTH: MannequinView[] = ["front", "back"];

export const GUIDE: Record<string, GuideEntry> = {
  /* ── Agbada outer robe ── */
  agbadaLength: {
    piece: "outer",
    label: "Agbada length",
    what: "How long the flowing outer robe hangs, from the base of your neck at the front down to the floor, or to the length you prefer.",
    steps: [
      "Stand straight in the shoes you will wear with the outfit.",
      "Place the end of the tape in the hollow at the base of your neck, at the front.",
      "Let the tape fall straight down the front of your body to the floor, or stop where you want the robe to end.",
    ],
    from: "The hollow at the base of your neck, at the front",
    to: "The floor, or your preferred length",
    direction: "vertical",
    tips: ["Look straight ahead. Looking down at the tape shortens the measurement.", "Prefer a shorter robe? Stop the tape where you want it to finish, such as the ankle or mid-calf."],
    placement: { kind: "line", views: ["front"], points: [[384, 212], [384, 1140]] },
  },
  agbadaWidth: {
    piece: "outer",
    label: "Agbada width (wrist to wrist)",
    what: "The full spread of the robe: with your arms stretched out to the sides, from one wrist, across your back, to the other wrist. This sets how wide the agbada drapes.",
    steps: [
      "Stretch both arms straight out to the sides at shoulder height, palms facing down.",
      "Ask someone to place the end of the tape on one wrist bone.",
      "Run the tape straight along the top of that arm, across the back of your shoulders, and along the other arm to the wrist bone.",
    ],
    from: "The wrist bone of one outstretched arm",
    to: "The wrist bone of the other outstretched arm",
    direction: "across",
    tips: ["You will need a second person for this one.", "Keep both arms level and straight. Dropping them makes the robe too narrow."],
    placement: { kind: "line", views: ["back"], points: [[140, 232], [624, 232]] },
  },

  /* ── Top: kaftan top, inner top, shirt, jalabia ── */
  neck: {
    piece: "top",
    label: "Neck",
    what: "The distance around your neck where a collar sits.",
    steps: [
      "Wrap the tape around the base of your neck, just below the Adam's apple.",
      "Slip one finger between the tape and your neck so the collar will not feel tight.",
      "Read the number where the tape meets its starting end.",
    ],
    from: "The front of your neck, below the Adam's apple",
    to: "All the way around, back to the same point",
    direction: "around",
    tips: ["Do not pull the tape tight against your throat.", "Keep your head up and look straight ahead."],
    placement: { kind: "around", views: BOTH, cx: 384, cy: 190, rx: 47 },
  },
  shoulder: {
    piece: "top",
    label: "Shoulder width",
    what: "The distance across your back from the edge of one shoulder to the edge of the other.",
    steps: [
      "Stand relaxed. Feel for the bony point at the outer edge of each shoulder, where a shirt's shoulder seam sits.",
      "Ask someone to place the tape on one shoulder point.",
      "Run it across the top of your back to the other shoulder point, letting it follow the slight curve below your neck.",
    ],
    from: "The outer bony edge of one shoulder",
    to: "The outer bony edge of the other shoulder",
    direction: "across",
    tips: ["This is across your back, not around your shoulders.", "Do not shrug or push your shoulders back."],
    placement: { kind: "line", views: ["back"], curve: true, points: [[246, 228], [382, 200], [520, 228]] },
  },
  chest: {
    piece: "top",
    label: "Chest",
    what: "The distance around the fullest part of your chest.",
    steps: [
      "Lift your arms slightly and wrap the tape around your body, under your armpits.",
      "Bring it across the fullest part of your chest, usually level with your nipples.",
      "Lower your arms, breathe normally, and read the number where the tape meets at the front.",
    ],
    from: "The centre of your chest",
    to: "All the way around, under both arms, back to the centre",
    direction: "around",
    tips: ["Keep the tape level across your back. It should not dip or ride up.", "Snug, not tight: you should be able to slide one finger under the tape.", "Do not puff out your chest."],
    placement: { kind: "around", views: BOTH, cx: 383, cy: 318, rx: 110 },
  },
  stomach: {
    piece: "top",
    label: "Stomach",
    what: "The distance around the fullest part of your stomach, so the top falls cleanly and does not pull.",
    steps: [
      "Stand relaxed and breathe out normally.",
      "Wrap the tape around the widest part of your stomach, usually level with your belly button.",
      "Read the number where the tape meets at the front.",
    ],
    from: "Your belly button",
    to: "All the way around, back to your belly button",
    direction: "around",
    tips: ["Do not hold your stomach in. A true number gives a better fit.", "Keep the tape level all the way around."],
    placement: { kind: "around", views: BOTH, cx: 382, cy: 440, rx: 97 },
  },
  sleeveShort: {
    piece: "top",
    label: "Short sleeve length",
    what: "For a short sleeve: from the edge of your shoulder down to the middle of your upper arm. Measure the sleeve lengths that match the styles you like; you do not need all three.",
    steps: [
      "Let your arm hang relaxed at your side.",
      "Place the end of the tape on the bony point at the outer edge of your shoulder.",
      "Run the tape down the outside of your arm to where you want the short sleeve to end, usually the middle of the upper arm.",
    ],
    from: "The outer bony edge of your shoulder",
    to: "The middle of your upper arm, or where you want the sleeve to end",
    direction: "along",
    tips: ["Only wearing long sleeves? Skip this one."],
    placement: { kind: "line", views: BOTH, points: [[524, 230], [538, 345]] },
  },
  sleeveThreeQuarter: {
    piece: "top",
    label: "Three-quarter sleeve length",
    what: "For a three-quarter sleeve: from the edge of your shoulder down to just below the elbow.",
    steps: [
      "Let your arm hang at your side with the elbow very slightly bent.",
      "Place the end of the tape on the bony point at the outer edge of your shoulder.",
      "Run the tape down the outside of your arm, over the elbow, to just below it.",
    ],
    from: "The outer bony edge of your shoulder",
    to: "Just below your elbow",
    direction: "along",
    tips: ["Only measure this if you want a three-quarter sleeve."],
    placement: { kind: "line", views: BOTH, points: [[524, 230], [546, 420], [552, 478]] },
  },
  sleeveLength: {
    piece: "top",
    label: "Long sleeve length",
    what: "For a long sleeve: from the edge of your shoulder down to the wrist.",
    steps: [
      "Let your arm hang at your side with the elbow very slightly bent.",
      "Place the end of the tape on the bony point at the outer edge of your shoulder.",
      "Run the tape down the outside of your arm, over the elbow, to the wrist bone.",
    ],
    from: "The outer bony edge of your shoulder",
    to: "Your wrist bone",
    direction: "along",
    tips: ["Keep the arm relaxed. A fully straight arm gives a sleeve that is too short."],
    placement: { kind: "line", views: BOTH, points: [[524, 230], [546, 420], [563, 598]] },
  },
  bicep: {
    piece: "top",
    label: "Round sleeve (short)",
    what: "How wide a short sleeve opening should be: the distance around the fullest part of your upper arm. Measure the round sleeves for the sleeve lengths you chose.",
    steps: [
      "Let your arm hang relaxed at your side.",
      "Wrap the tape around the widest part of your upper arm, midway between the shoulder and elbow.",
      "Read the number where the tape meets.",
    ],
    from: "The outside of your upper arm",
    to: "All the way around the arm, back to the same point",
    direction: "around",
    tips: ["Do not flex your muscle.", "Tailors call this the round sleeve."],
    placement: { kind: "around", views: BOTH, cx: 532, cy: 350, rx: 35 },
  },
  roundSleeveThreeQuarter: {
    piece: "top",
    label: "Round sleeve (three-quarter)",
    what: "How wide a three-quarter sleeve opening should be: the distance around your forearm, just below the elbow.",
    steps: [
      "Let your arm hang relaxed at your side.",
      "Wrap the tape around your forearm just below the elbow, where a three-quarter sleeve ends.",
      "Read the number where the tape meets.",
    ],
    from: "The outside of your forearm, just below the elbow",
    to: "All the way around the arm, back to the same point",
    direction: "around",
    tips: ["Keep the tape snug but not tight; the sleeve should move freely."],
    placement: { kind: "around", views: BOTH, cx: 550, cy: 478, rx: 28 },
  },
  roundSleeveLong: {
    piece: "top",
    label: "Round sleeve (long)",
    what: "How wide a long sleeve should be at the cuff: the distance around your wrist.",
    steps: [
      "Wrap the tape around your wrist, over the wrist bone.",
      "Leave room for one finger so the cuff is comfortable.",
      "Read the number where the tape meets.",
    ],
    from: "The top of your wrist bone",
    to: "All the way around, back to the start",
    direction: "around",
    tips: ["If you wear a watch, measure the wrist you wear it on."],
    placement: { kind: "around", views: BOTH, cx: 562, cy: 592, rx: 22 },
  },
  length: {
    piece: "top",
    label: "Top length",
    what: "How long the top is, from the base of your neck at the front down to where you want it to end.",
    steps: [
      "Stand straight and look ahead.",
      "Place the end of the tape in the hollow at the base of your neck, at the front.",
      "Let the tape fall straight down the front of your body to where the top should end. Kaftan tops usually finish around mid-thigh to the knee.",
    ],
    from: "The hollow at the base of your neck, at the front",
    to: "Where you want the hem of the top to finish",
    direction: "vertical",
    tips: ["Not sure? Measure a top you already own and like, from the neckline to the hem.", "Stand straight. Bending forward makes the top too short."],
    placement: { kind: "line", views: ["front"], points: [[384, 212], [384, 770]] },
  },

  /* ── Trousers ── */
  waist: {
    piece: "trouser",
    label: "Waist",
    what: "The distance around your body where you wear the waistband of your trousers.",
    steps: [
      "Find where your trouser waistband normally sits, usually just below the belly button.",
      "Wrap the tape around your body at that level.",
      "Breathe normally and read the number where the tape meets at the front.",
    ],
    from: "The front of your waistband line",
    to: "All the way around, back to the front",
    direction: "around",
    tips: ["Do not pull your stomach in.", "Measure against your body or a thin layer, never over a belt or thick trousers."],
    placement: { kind: "around", views: BOTH, cx: 383, cy: 505, rx: 104 },
  },
  hip: {
    piece: "trouser",
    label: "Hip",
    what: "The distance around the fullest part of your hips and bottom.",
    steps: [
      "Stand with your feet together.",
      "Wrap the tape around the widest part of your hips and bottom.",
      "Check in a mirror that the tape is level all the way around, then read the number.",
    ],
    from: "The front of one hip",
    to: "All the way around the fullest part of your seat, back to the start",
    direction: "around",
    tips: ["Empty your pockets first.", "Keep the tape level. It tends to ride up at the back."],
    placement: { kind: "around", views: BOTH, cx: 383, cy: 628, rx: 127 },
  },
  thigh: {
    piece: "trouser",
    label: "Thigh",
    what: "The distance around the very top of one thigh, where the leg begins. Tailors call this the lap.",
    steps: [
      "Stand with your feet slightly apart and your weight on both legs.",
      "Wrap the tape around the very top of one thigh, right where the leg divides from the body at the crotch.",
      "Read the number where the tape meets.",
    ],
    from: "The front of your thigh, at the crotch line",
    to: "All the way around the thigh, back to the start",
    direction: "around",
    tips: ["Stay relaxed and do not tense the leg.", "Keep the tape level, not slanted."],
    placement: { kind: "around", views: BOTH, cx: 447, cy: 682, rx: 60 },
  },
  trouserLength: {
    piece: "trouser",
    label: "Trouser length",
    what: "The full length of the trousers down the outside of your leg, from the waistband to the ankle.",
    steps: [
      "Stand straight in the shoes you will wear with the outfit.",
      "Place the end of the tape at your side, where the top of your waistband sits.",
      "Run the tape straight down the outside of your leg to your ankle bone.",
    ],
    from: "The top of your waistband, at your side",
    to: "Your ankle bone, or where you want the trousers to end",
    direction: "vertical",
    tips: ["Easier with help: bending to read the tape changes the measurement.", "Or measure a pair of trousers that fit you well, from waistband to hem."],
    placement: { kind: "line", views: BOTH, points: [[494, 505], [515, 630], [503, 860], [492, 1074]] },
  },
  ankle: {
    piece: "trouser",
    label: "Trouser bottom",
    what: "How wide you want the leg opening at the bottom of your trousers. Tailors call this the mouth.",
    steps: [
      "Wrap the tape around your leg at the ankle bone.",
      "Loosen the tape until it matches how wide you want the trouser opening to be.",
      "Check that your foot can still pass through, then read the number.",
    ],
    from: "The front of your ankle",
    to: "Around the leg at the width you want, back to the start",
    direction: "around",
    tips: ["For a slim finish, add about 10 cm (4 in) to your bare ankle measurement.", "Or measure all the way around the hem opening of a pair of trousers you like."],
    placement: { kind: "around", views: BOTH, cx: 465, cy: 1068, rx: 25 },
  },

  /* ── Fields older orders and profiles may still carry ── */
  inseam: {
    piece: "trouser",
    label: "Inside leg",
    what: "The length of the inside of your leg, from the crotch down to the ankle.",
    steps: ["Stand straight with your feet slightly apart.", "Place the end of the tape high on the inside of your leg, at the crotch.", "Run it straight down the inside of the leg to the ankle bone."],
    from: "The top of your inner leg",
    to: "Your inner ankle bone",
    direction: "vertical",
    tips: ["Ask someone to help, or measure the inside seam of trousers that fit you well."],
    placement: { kind: "line", views: ["front"], points: [[393, 702], [428, 870], [442, 1074]] },
  },
  knee: {
    piece: "trouser",
    label: "Knee",
    what: "The distance around your knee.",
    steps: ["Stand straight with your leg relaxed.", "Wrap the tape around the middle of your kneecap.", "Read the number where the tape meets."],
    from: "The front of your kneecap",
    to: "All the way around, back to the start",
    direction: "around",
    tips: ["Keep the leg straight but not locked."],
    placement: { kind: "around", views: BOTH, cx: 459, cy: 868, rx: 38 },
  },
  wrist: {
    piece: "top",
    label: "Wrist",
    what: "The distance around your wrist, for the cuff.",
    steps: ["Wrap the tape around your wrist, over the wrist bone.", "Leave room for one finger so the cuff is comfortable.", "Read the number where the tape meets."],
    from: "The top of your wrist bone",
    to: "All the way around, back to the start",
    direction: "around",
    tips: ["If you wear a watch, measure the wrist you wear it on."],
    placement: { kind: "around", views: BOTH, cx: 563, cy: 598, rx: 21 },
  },
  height: {
    piece: "other",
    label: "Height",
    what: "Your full height without shoes.",
    steps: ["Take your shoes off and stand against a wall.", "Look straight ahead.", "Measure from the floor to the top of your head."],
    from: "The floor",
    to: "The top of your head",
    direction: "vertical",
    tips: ["Rest a flat book on your head and mark the wall for an accurate reading."],
    placement: { kind: "line", views: ["front"], points: [[606, 1176], [606, 22]] },
  },
};
GUIDE.outseam = { ...GUIDE.trouserLength, label: "Outside leg" };

/* ───────────────────────────── Style → pieces ───────────────────────────── */

export interface MeasurementPiece {
  id: PieceId;
  title: string;
  blurb: string;
  fields: string[];
}

export interface MeasurementPlan {
  /** e.g. "Agbada": what the customer is being measured for. */
  styleName: string;
  pieces: MeasurementPiece[];
  /** All fields, in asking order. */
  fields: string[];
}

type Style = { name: string; titles: Partial<Record<PieceId, [title: string, blurb: string]>>; fullLength?: boolean };

const DEFAULT_TITLES: Record<PieceId, [string, string]> = {
  outer: ["Outer robe", "The flowing outer garment."],
  top: ["Top", "The top half of your outfit."],
  trouser: ["Trousers", "The trousers."],
  other: ["Other details", "A few extra details for your tailor."],
};

/** How each style names its garment pieces. Keyed by category slug first,
 * then garment family; this only affects wording, never which fields show. */
const STYLES: Record<string, Style> = {
  agbada: {
    name: "Agbada",
    titles: {
      outer: ["Agbada", "The wide, flowing outer robe."],
      top: ["Inner top", "The fitted top worn under the agbada."],
      trouser: ["Trousers", "The matching trousers."],
    },
  },
  kaftans: { name: "Kaftan", titles: { top: ["Kaftan top", "The long kaftan top."], trouser: ["Trousers", "The matching trousers."] } },
  senator: { name: "Senator", titles: { top: ["Senator top", "The senator top."], trouser: ["Trousers", "The matching trousers."] } },
  jalabia: { name: "Jalabia", titles: { top: ["Jalabia", "The full-length robe."] }, fullLength: true },
  shirts: { name: "Shirt", titles: { top: ["Shirt", "Your shirt."] } },
  pants: { name: "Trousers", titles: { trouser: ["Trousers", "Your trousers."] } },
};
const GARMENT_STYLE: Partial<Record<Garment, Style>> = {
  agbada: STYLES.agbada,
  set: { name: "Two-piece set", titles: {} },
  top: { name: "Top", titles: {} },
  trouser: STYLES.pants,
};

function styleOf(product: Pick<Product, "category" | "garment">, categories: Category[]): Style {
  const category = categories.find((c) => c.slug === product.category || c.name.toLowerCase() === product.category.toLowerCase());
  return STYLES[category?.slug ?? product.category] ?? GARMENT_STYLE[product.garment] ?? { name: category?.name ?? "Outfit", titles: {} };
}

const PIECE_ORDER: PieceId[] = ["outer", "top", "trouser", "other"];

export function pieceOf(key: string, def?: MeasurementFieldDef): PieceId {
  if (GUIDE[key]) return GUIDE[key].piece;
  const garments = def?.garments ?? [];
  if (garments.includes("trouser")) return "trouser";
  if (garments.includes("top") || garments.includes("set")) return "top";
  if (garments.includes("agbada")) return "outer";
  return "other";
}

/** Every field enabled for a garment family, in admin sort order. */
export function defaultMeasurementFields(defs: MeasurementFieldDef[], garment: Garment): string[] {
  return defs
    .filter((d) => d.garments.includes(garment))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => d.key);
}

/** The field keys a product asks for, before grouping. */
export function measurementFieldsFor(product: Pick<Product, "category" | "garment" | "measurementFieldKeys">, categories: Category[], defs: MeasurementFieldDef[]): string[] {
  if (product.measurementFieldKeys?.length) return product.measurementFieldKeys;
  const category = categories.find((c) => c.slug === product.category || c.name.toLowerCase() === product.category.toLowerCase());
  if (category?.measurementFieldKeys?.length) return category.measurementFieldKeys;
  return defaultMeasurementFields(defs, product.garment);
}

function groupIntoPieces(keys: string[], defs: MeasurementFieldDef[], style: Style): MeasurementPiece[] {
  const order = new Map(defs.map((d) => [d.key, d.sortOrder]));
  const byPiece = new Map<PieceId, string[]>();
  for (const key of [...new Set(keys)]) {
    const piece = pieceOf(key, defs.find((d) => d.key === key));
    byPiece.set(piece, [...(byPiece.get(piece) ?? []), key]);
  }
  return PIECE_ORDER.filter((id) => byPiece.has(id)).map((id) => {
    const [title, blurb] = style.titles[id] ?? DEFAULT_TITLES[id];
    const fields = byPiece.get(id)!.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
    return { id, title, blurb, fields };
  });
}

export function resolveMeasurementPlan(product: Pick<Product, "category" | "garment" | "measurementFieldKeys">, categories: Category[], defs: MeasurementFieldDef[]): MeasurementPlan {
  const style = styleOf(product, categories);
  const pieces = groupIntoPieces(measurementFieldsFor(product, categories, defs), defs, style);
  return { styleName: style.name, pieces, fields: pieces.flatMap((p) => p.fields) };
}

/** A plan over every configured field, for a general-purpose saved profile. */
export function fullMeasurementPlan(defs: MeasurementFieldDef[]): MeasurementPlan {
  const keys = defs.filter((d) => d.garments.length > 0).map((d) => d.key);
  const pieces = groupIntoPieces(keys, defs, { name: "All garments", titles: { outer: ["Agbada", "Only needed for agbada."], top: ["Top", "Kaftan tops, shirts, jalabia and inner tops."] } });
  return { styleName: "All garments", pieces, fields: pieces.flatMap((p) => p.fields) };
}

/* ───────────────────────────── Field details ───────────────────────────── */

export interface FieldGuide {
  key: string;
  label: string;
  what: string;
  steps: string[];
  from?: string;
  to?: string;
  direction?: TapeDirection;
  tips: string[];
  placement?: Placement;
  required: boolean;
  minCm?: number;
  maxCm?: number;
  videoUrl?: string;
}

const lines = (text?: string) => (text ?? "").split(/\n+/).map((s) => s.trim()).filter(Boolean);

/** Guide for one field: admin-authored copy where present, otherwise the
 * built-in guide. `fullLength` styles (jalabia) run the top length to the floor. */
export function fieldGuide(key: string, defs: MeasurementFieldDef[], plan?: MeasurementPlan): FieldGuide {
  const def = defs.find((d) => d.key === key);
  let base = GUIDE[key];
  if (key === "length" && plan?.styleName === "Jalabia") {
    base = {
      ...base,
      label: "Jalabia length",
      what: "The full length of the jalabia, from the base of your neck at the front down to the floor, or to the length you prefer.",
      steps: [base.steps[0], base.steps[1], "Let the tape fall straight down the front of your body to the floor, or stop where you want the jalabia to end."],
      to: "The floor, or your preferred length",
      tips: ["Stand straight. Bending forward makes the jalabia too short.", "Measure in the shoes or sandals you will wear with it."],
      placement: { kind: "line", views: ["front"], points: [[384, 212], [384, 1140]] },
    };
  }
  const adminSteps = lines(def?.instructions);
  const adminTips = lines(def?.commonMistakes);
  return {
    key,
    label: base && (!def || def.label === GUIDE[key].label) ? base.label : def?.label ?? base?.label ?? key,
    what: def?.description || base?.what || "",
    steps: adminSteps.length ? adminSteps : base?.steps ?? [],
    from: base?.from,
    to: base?.to,
    direction: base?.direction,
    tips: adminTips.length ? adminTips : base?.tips ?? ["Keep the tape flat against your body without pulling it tight."],
    placement: base?.placement,
    required: def ? def.required : true,
    minCm: def?.minCm ?? undefined,
    maxCm: def?.maxCm ?? undefined,
    videoUrl: def?.videoUrl || undefined,
  };
}

/* ───────────────────────────── Values ───────────────────────────── */

export const toCm = (value: number, unit: MeasurementUnit) => (unit === "in" ? value * 2.54 : value);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Re-express every value in another unit (1 decimal place). */
export function convertValues(values: MeasurementValues, from: MeasurementUnit, to: MeasurementUnit): MeasurementValues {
  if (from === to) return values;
  const factor = to === "in" ? 1 / 2.54 : 2.54;
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "number" ? round1(v * factor) : v]));
}

export function formatRange(guide: FieldGuide, unit: MeasurementUnit) {
  if (guide.minCm == null || guide.maxCm == null) return null;
  const f = (cm: number) => (unit === "in" ? round1(cm / 2.54) : cm);
  return `${f(guide.minCm)}–${f(guide.maxCm)} ${unit}`;
}

export type FieldProblem = "missing" | "invalid" | "unusual" | null;

/** "missing": required and empty. "invalid": not a positive number.
 * "unusual": outside the expected range, usually a unit mix-up; it warns
 * but never blocks, because some bodies are simply outside the range. */
export function fieldProblem(guide: FieldGuide, value: number | undefined, unit: MeasurementUnit): FieldProblem {
  if (value === undefined || value === null || Number.isNaN(value)) return guide.required ? "missing" : null;
  if (!(value > 0)) return "invalid";
  const cm = toCm(value, unit);
  if ((guide.minCm != null && cm < guide.minCm) || (guide.maxCm != null && cm > guide.maxCm)) return "unusual";
  return null;
}
