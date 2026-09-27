"use client";

// The homepage is fully admin-controlled: section order, visibility, and
// copy come from `homepageSections` in AdminStoreProvider (edited at
// /admin/homepage). Adding a new section type means adding one case here.

import { useMemo } from "react";
import { useAdminStore } from "@/lib/admin/store";
import Hero from "@/components/home/Hero";
import FeaturedCategories from "@/components/home/FeaturedCategories";
import FeaturedCollections from "@/components/home/FeaturedCollections";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import SignatureSection from "@/components/home/SignatureSection";
import MadeToMeasureSection from "@/components/home/MadeToMeasureSection";
import HowItWorks from "@/components/home/HowItWorks";
import DeliverySection from "@/components/home/DeliverySection";
import PromoBannerSection from "@/components/home/PromoBannerSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import NewsletterSection from "@/components/home/NewsletterSection";

export default function Home() {
  const { homepageSections, isReady } = useAdminStore();

  const sections = useMemo(
    () => [...homepageSections].filter((s) => s.visible).sort((a, b) => a.sortOrder - b.sortOrder),
    [homepageSections]
  );

  if (!isReady) return <div className="min-h-[60vh]" />;

  return (
    <>
      {sections.map((s) => {
        switch (s.type) {
          case "hero":
            return <Hero key={s.id} content={s.content} />;
          case "featured-categories":
            return <FeaturedCategories key={s.id} headline={s.content.headline} />;
          case "featured-collections":
            return <FeaturedCollections key={s.id} headline={s.content.headline} />;
          case "featured-products":
            return <FeaturedProducts key={s.id} headline={s.content.headline} />;
          case "signature":
            return <SignatureSection key={s.id} content={s.content} />;
          case "made-to-measure-promo":
            return <MadeToMeasureSection key={s.id} content={s.content} />;
          case "how-it-works":
            return <HowItWorks key={s.id} headline={s.content.headline} />;
          case "promo-banner":
            return <PromoBannerSection key={s.id} bannerId={s.content.bannerId} />;
          case "testimonials":
            return <TestimonialsSection key={s.id} headline={s.content.headline} />;
          case "newsletter":
            return <NewsletterSection key={s.id} content={s.content} />;
          default:
            return null;
        }
      })}
      {/* Delivery/production explainer isn't a reorderable homepage section
          (it's sourced live from admin production settings) but stays part
          of the standard homepage layout. */}
      <DeliverySection />
    </>
  );
}
