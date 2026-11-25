// Typography for admin-authored HTML (CMS pages, journal posts). The
// @tailwindcss/typography plugin isn't installed, so the rendered elements are
// styled directly with arbitrary variants in the house type.
export const RICH_TEXT = [
  "max-w-none text-[0.95rem] leading-relaxed text-ink/75",
  "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-4",
  "[&_h3]:font-display [&_h3]:text-xl [&_h3]:text-ink [&_h3]:mt-8 [&_h3]:mb-3",
  "[&_h4]:font-semibold [&_h4]:text-ink [&_h4]:mt-6 [&_h4]:mb-2",
  "[&_p]:mb-4",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_li]:mb-1.5",
  "[&_a]:text-brass [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-ink",
  "[&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic",
  "[&_blockquote]:border-l [&_blockquote]:border-brass [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6",
  "[&_hr]:my-10 [&_hr]:border-line",
  "[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full",
  "[&_table]:my-6 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_th]:text-left [&_td]:border-b [&_td]:border-line [&_td]:py-2",
  "[&>*:first-child]:mt-0",
].join(" ");
