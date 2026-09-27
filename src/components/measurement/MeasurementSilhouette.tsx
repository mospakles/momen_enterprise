"use client";

const points: Record<string, { x: number; y: number }> = {
  neck: { x: 100, y: 50 },
  shoulder: { x: 100, y: 62 },
  chest: { x: 100, y: 92 },
  bicep: { x: 148, y: 96 },
  armhole: { x: 138, y: 78 },
  waist: { x: 100, y: 128 },
  hip: { x: 100, y: 158 },
  sleeveLength: { x: 152, y: 110 },
  wrist: { x: 164, y: 148 },
  length: { x: 100, y: 190 },
  thigh: { x: 92, y: 250 },
  knee: { x: 90, y: 300 },
  inseam: { x: 92, y: 320 },
  outseam: { x: 112, y: 300 },
  trouserLength: { x: 100, y: 370 },
  height: { x: 168, y: 220 },
};

export default function MeasurementSilhouette({
  active,
  className = "",
}: {
  active?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 420" className={className} fill="none" stroke="currentColor" strokeWidth="1">
      {/* figure line-art */}
      <circle cx="100" cy="34" r="20" />
      <path d="M100 54v10" />
      <path d="M64 100c0-24 16-40 36-40s36 16 36 40l6 60c1 10-4 18-14 20l-4 60H80l-4-60c-10-2-15-10-14-20l2-60Z" />
      <path d="M70 76 40 130" />
      <path d="M130 76l30 54" />
      <path d="M84 240l-8 130" />
      <path d="M116 240l8 130" />
      <path d="M76 370h48" />
      <path d="M116 370h48" opacity="0" />

      {Object.entries(points).map(([key, p]) => {
        const isActive = key === active;
        return (
          <g key={key}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isActive ? 5 : 2.6}
              fill={isActive ? "var(--color-brass)" : "var(--color-stone)"}
              stroke="none"
              className="transition-all duration-300"
            />
            {isActive && (
              <circle cx={p.x} cy={p.y} r="10" stroke="var(--color-brass)" strokeWidth="0.75" opacity="0.6" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
