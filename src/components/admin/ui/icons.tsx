// A small, consistent line-icon set (24×24, round strokes) so the admin
// sidebar and headers don't rely on emoji. Add new names as new modules need
// them — every icon shares the same stroke weight and viewBox.

const PATHS: Record<string, string> = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  box: "M3 7.5 12 3l9 4.5-9 4.5-9-4.5ZM3 7.5V16.5L12 21l9-4.5V7.5M12 12v9",
  layers: "M12 3 2 8l10 5 10-5-10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
  tag: "M20.6 12.6 12.4 20.8a2 2 0 0 1-2.8 0L3 14.2V4h10.2l7.4 7.4a2 2 0 0 1 0 2.8ZM7.5 8.5h.01",
  archive: "M3 5h18v4H3V5ZM4 9h16v10H4V9ZM10 13h4",
  users: "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  ruler: "m3 17 5.5-5.5L21 3.5 20.5 4 8.5 16l-5.5 1ZM14.5 9.5l2 2M11.5 12.5l2 2M8.5 15.5l2 2",
  card: "M2 6h20v12H2zM2 10h20M6 15h4",
  refresh: "M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12",
  truck: "M2 8h11v9H2zM13 11h4l4 4v2h-8zM6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  percent: "M5 19 19 5M7.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  gift: "M3 9h18v11H3zM3 9V6a2 2 0 0 1 2-2h1.5a2.5 2.5 0 0 1 0 5H3ZM21 9V6a2 2 0 0 0-2-2h-1.5a2.5 2.5 0 0 0 0 5H21ZM12 9v11M12 4a2 2 0 1 0-2-2M12 4a2 2 0 1 1 2-2",
  star: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1L12 2Z",
  heart: "M12 21s-7.5-4.9-10-9.3C.4 8.5 2 4.8 5.6 4.1 8 3.6 10.4 4.8 12 7c1.6-2.2 4-3.4 6.4-2.9 3.6.7 5.2 4.4 3.6 7.6C19.5 16.1 12 21 12 21Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M9 13h6M9 17h6",
  image: "M4 4h16v16H4zM9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM20 15l-5-5-9 9",
  layout: "M3 4h18v4H3zM3 10h6v10H3zM11 10h10v10H11z",
  menu: "M4 6h16M4 12h16M4 18h16",
  flag: "M5 3v18M5 4h13l-3 4 3 4H5",
  quote: "M8 15a4 4 0 0 0 4-4V6H5v5h4v.5A2.5 2.5 0 0 1 6.5 14M18 15a4 4 0 0 0 4-4V6h-7v5h4v.5a2.5 2.5 0 0 1-2.5 2.5",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.5 9a2.5 2.5 0 0 1 4.85.8c0 1.7-2.35 2.2-2.35 3.7M12 17.5h.01",
  book: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5v-16ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20",
  bell: "M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM9.5 19a2.5 2.5 0 0 0 5 0",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  chart: "M4 20V10M11 20V4M18 20v-7M2 20h20",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.55V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10c.14.42.44.77.83 1H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  userCheck: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11l2 2 4-4",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  x: "M18 6 6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  more: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  check: "M20 6 9 17l-5-5",
  home: "M3 10.5 12 3l9 7.5V21H3z",
  filter: "M22 3H2l8 9.5V19l4 2v-8.5L22 3Z",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  sun: "M12 5V3M12 21v-2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  alert: "M12 9v4M12 17h.01M10.3 3.86 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0Z",
  calendar: "M8 2v4M16 2v4M3 9h18M4 5h16v15H4z",
  dollar: "M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.4-5 3.2c0 4 10 1.8 10 6C17 15 14.8 16.5 12 16.5s-5-1.1-5-3",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof PATHS | string; className?: string }) {
  const d = PATHS[name] ?? PATHS.box;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
