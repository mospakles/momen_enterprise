// Every photograph in public/images/campaign, each tied to the style it shows,
// so any page can show campaign imagery that links straight to the product.

import { bespokeSlug, campaignPhoto, campaignRange, type CampaignStyle } from "../../server/prisma/campaign-range";

export interface CampaignShot {
  name: string;
  src: string;
  alt: string;
  /** Short caption, e.g. "Ankara Pants · Cobalt and tan". */
  label: string;
  href: string;
  styleSlug: string;
  pos: string;
  wide?: boolean;
}

const views: Record<string, string> = {
  front: "front view", side: "side view", back: "back view", detail: "close-up", styled: "styled",
  motion: "in motion", angle: "angled view", studio: "in the studio", profile: "in profile",
  portrait: "portrait", seated: "seated", wide: "seated", "full-length": "full length",
  "studio-light": "in studio light", "side-detail": "side detail",
};

function viewOf(name: string) {
  const key = Object.keys(views).sort((a, b) => b.length - a.length).find((suffix) => name.endsWith(suffix));
  return key ? views[key] : "";
}

function focusFor(name: string) {
  if (/cap/.test(name)) return "50% 30%";
  if (/trousers/.test(name)) return "50% 60%";
  return "50% 28%";
}

const hrefFor = (style: CampaignStyle) => `/product/${style.readyToWear ? style.slug : bespokeSlug(style)}`;

// Photographs only: style illustrations never appear in the lookbook or photo rows.
const fromRange: CampaignShot[] = campaignRange.flatMap((style) => style.colours.filter((colour) => !colour.illustration).flatMap((colour) =>
  colour.photos.map((name) => {
    const colourName = style.colours.length > 1 ? ` in ${colour.name.toLowerCase()}` : "";
    const view = viewOf(name);
    return {
      name, src: campaignPhoto(name), styleSlug: style.slug, href: hrefFor(style), pos: focusFor(name),
      alt: `${style.name}${colourName}${view ? `, ${view}` : ""}`,
      label: style.colours.length > 1 ? `${style.name} · ${colour.name}` : style.name,
    };
  })));

const group = (name: string, styleSlug: string, alt: string, label: string, pos = "50% 40%", wide = false): CampaignShot =>
  ({ name, src: campaignPhoto(name), styleSlug, href: `/product/${styleSlug}`, alt, label, pos, wide });

const groups: CampaignShot[] = [
  group("patterned-trousers-trio", "ankara-pants", "Three pairs of Ankara pants with tan, patchwork and striped cuffs", "Ankara Pants · Three treatments", "50% 60%", true),
  group("ivory-and-blue-sets", "two-piece", "Two men in textured ivory and sky-blue two-piece sets", "Two-Piece Set · Ivory and sky", "50% 25%"),
  group("cobalt-trousers-duo-front", "ankara-pants", "Two men in white tees and cobalt Ankara pants with tan and striped cuffs", "Ankara Pants · Two cuffs", "50% 30%"),
  group("cobalt-trousers-duo-side", "ankara-pants", "Two men back to back in cobalt Ankara pants", "Ankara Pants · Back to back", "50% 30%"),
  group("patterned-trousers-group-front", "ankara-pants", "Three pairs of patterned trousers side by side", "Ankara & patchwork pants", "50% 55%"),
  group("patterned-trousers-group-side", "ankara-pants", "Side views of three patterned trousers with contrasting panels and cuffs", "Ankara & patchwork pants", "50% 55%"),
];

export const campaignShots: readonly CampaignShot[] = [...groups, ...fromRange].filter(
  (shot, i, all) => all.findIndex((other) => other.name === shot.name) === i,
);

const byName = new Map(campaignShots.map((shot) => [shot.name, shot]));

/** Look up shots by file name (without extension), in the given order. */
export function shots(...names: string[]): CampaignShot[] {
  return names.flatMap((name) => byName.get(name) ?? []);
}

export function shotsForStyle(styleSlug: string) {
  return campaignShots.filter((shot) => shot.styleSlug === styleSlug);
}
