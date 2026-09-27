const steps = [
  {
    title: "Choose Your Piece",
    body: "Browse ready-to-wear or made-to-measure pieces across shirts, dresses, sets, and more.",
  },
  {
    title: "Provide Your Measurements",
    body: "Enter measurements you already have, or use our guided, illustrated process.",
  },
  {
    title: "We Craft Your Order",
    body: "Your piece is cut and finished by hand in our Lagos atelier, to your specification.",
  },
  {
    title: "Delivered to Your Door",
    body: "Track production and delivery in real time, from atelier to doorstep.",
  },
];

export default function HowItWorks({ headline }: { headline?: string }) {
  return (
    <section className="bg-charcoal py-20 text-ivory">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="eyebrow text-stone-light">The Process</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">{headline || "How It Works"}</h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative pl-0">
              <p className="font-display text-4xl text-brass-light/70">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-4 font-display text-xl">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-light/90">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
