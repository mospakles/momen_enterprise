import NewsletterForm from "@/components/home/NewsletterForm";

export interface NewsletterContent {
  headline?: string;
  subheading?: string;
}

export default function NewsletterSection({ content }: { content?: NewsletterContent }) {
  return (
    <section className="border-t border-line bg-ink py-20 text-center text-ivory">
      <div className="mx-auto max-w-xl px-4">
        <p className="eyebrow text-stone-light">Stay Close</p>
        <h2 className="mt-2 font-display text-3xl italic sm:text-4xl">{content?.headline || "Join the Momen List"}</h2>
        <p className="mt-4 text-stone-light/90">
          {content?.subheading || "Be the first to discover new collections, exclusive pieces, and Momen stories."}
        </p>
        <div className="mt-8 flex justify-center">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
