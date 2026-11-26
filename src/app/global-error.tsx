"use client";

// Last-resort fallback if the root layout itself fails. It replaces the whole
// document, so it carries its own minimal styling.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#F7F4EC", color: "#1C1A16", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontWeight: 400, fontSize: 32 }}>Something went wrong.</h1>
          <p style={{ opacity: 0.7 }}>Please try again. If it keeps happening, contact us and we&rsquo;ll help.</p>
          <button type="button" onClick={() => retry()} style={{ marginTop: 24, padding: "12px 24px", background: "#1C1A16", color: "#F7F4EC", border: 0, cursor: "pointer" }}>
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 24, fontSize: 12, opacity: 0.5 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
