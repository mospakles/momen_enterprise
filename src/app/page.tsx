import type { Metadata } from "next";
import Journey from "@/components/journey/Journey";

export const metadata: Metadata = {
  title: "momen. | Ready-to-Wear & Bespoke, Lagos",
  description:
    "Shop Ankara pants, aso-oke patchwork, jalabia, two-piece sets, vintage shirts, linen tees and fila. Explore made-to-measure styles from momen. in Lagos.",
};

export default function Home() {
  return <Journey />;
}
