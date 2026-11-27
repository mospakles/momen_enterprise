import type { Metadata } from "next";
import Link from "next/link";
import { CampaignRange } from "@/components/collection/CampaignRange";
import { casuals, casualsCollection } from "@/lib/campaign-catalogue";

export const metadata: Metadata = {
  title: casualsCollection.name,
  description: casualsCollection.description,
  alternates: { canonical: casualsCollection.href },
};

export default function CasualsPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href="/collections" className="underline underline-offset-4">Collections</Link>
      </nav>
      <header className="mb-8">
        <h1 className="display text-5xl sm:text-6xl">{casualsCollection.name}</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink/75">{casualsCollection.description}</p>
      </header>
      <CampaignRange styles={casuals} madeToMeasure columns={3} />
    </div>
  );
}
