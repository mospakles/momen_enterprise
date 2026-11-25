import { redirect } from "next/navigation";
import { campaignCollections } from "@/lib/campaign-catalogue";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(campaignCollections.find((collection) => collection.slug === slug)?.href ?? "/collections");
}
