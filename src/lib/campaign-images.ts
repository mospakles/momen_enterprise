import { campaignPhoto } from "../../server/prisma/campaign-range";
export { campaignPhoto };

export const campaignHero = {
  src: campaignPhoto("ivory-and-blue-sets"),
  alt: "Two men in coordinated ivory and sky-blue outfits",
  pos: "50% 28%",
};

export const campaignCategoryCovers: Readonly<Record<string, string>> = {
  kaftans: campaignPhoto("blue-geometric-set-full-length"),
  jalabia: campaignPhoto("burgundy-robe-front"),
  shirts: campaignPhoto("landscape-print-shirt-front"),
  pants: campaignPhoto("patterned-trousers-group-front"),
  "casual-wear": campaignPhoto("ivory-textured-set-front"),
  accessories: campaignPhoto("burgundy-striped-cap-profile"),
  caps: campaignPhoto("white-cap-profile"),
};

export const campaignCollectionCovers: Readonly<Record<string, string>> = {
  "new-arrivals": campaignHero.src,
  signature: campaignPhoto("burgundy-robe-studio"),
  occasion: campaignPhoto("blue-geometric-set-front"),
  everyday: campaignPhoto("ivory-and-blue-sets"),
  heritage: campaignPhoto("ivory-woven-panel-shirt-front"),
  contemporary: campaignPhoto("patterned-trousers-group-side"),
};
