import type { Metadata } from "next";
import Journey from "@/components/journey/Journey";

// The landing page is the brand journey: story first, shop second.

export const metadata: Metadata = {
  title: "momen. — Tailored heritage. Modern men.",
  description:
    "momen. is an African menswear house in Lagos: agbada, kaftan and jalabia cut with a modern hand, ready-to-wear and made to measure.",
};

export default function Home() {
  return <Journey />;
}
