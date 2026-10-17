import type { CSSProperties } from 'react';

export type AccessoryKind = 'glasses' | 'earrings' | 'necklace';

export interface AccessoryAsset {
  kind: AccessoryKind;
  label: string;
  emoji: string;
  /** Render an absolutely-positioned SVG overlay; caller passes computed transform. */
  render: (style: CSSProperties) => JSX.Element;
}

const GlassesSVG = ({ style }: { style: CSSProperties }) => (
  <svg style={style} viewBox="0 0 320 120" className="pointer-events-none drop-shadow-lg">
    <defs>
      <linearGradient id="lensGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f472b6" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.75" />
      </linearGradient>
    </defs>
    <ellipse cx="80" cy="60" rx="68" ry="48" fill="url(#lensGrad)" stroke="#db2777" strokeWidth="6" />
    <ellipse cx="240" cy="60" rx="68" ry="48" fill="url(#lensGrad)" stroke="#db2777" strokeWidth="6" />
    <path d="M148 56 Q160 40 172 56" fill="none" stroke="#db2777" strokeWidth="6" strokeLinecap="round" />
    <path d="M12 54 L8 46" stroke="#db2777" strokeWidth="6" strokeLinecap="round" />
    <path d="M308 54 L312 46" stroke="#db2777" strokeWidth="6" strokeLinecap="round" />
    <ellipse cx="80" cy="48" rx="28" ry="14" fill="white" opacity="0.25" />
    <ellipse cx="240" cy="48" rx="28" ry="14" fill="white" opacity="0.25" />
  </svg>
);

const EarringsSVG = ({ style }: { style: CSSProperties }) => (
  <svg style={style} viewBox="0 0 200 260" className="pointer-events-none drop-shadow-lg">
    <defs>
      <radialGradient id="gemGrad">
        <stop offset="0%" stopColor="#fce7f3" />
        <stop offset="60%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#9333ea" />
      </radialGradient>
    </defs>
    {/* Left earring */}
    <g transform="translate(45,10)">
      <circle cx="0" cy="8" r="7" fill="#db2777" />
      <line x1="0" y1="15" x2="0" y2="60" stroke="#be185d" strokeWidth="2.5" />
      <circle cx="0" cy="78" r="22" fill="url(#gemGrad)" stroke="#831843" strokeWidth="2" />
      <circle cx="-6" cy="72" r="6" fill="white" opacity="0.45" />
    </g>
    {/* Right earring */}
    <g transform="translate(155,10)">
      <circle cx="0" cy="8" r="7" fill="#db2777" />
      <line x1="0" y1="15" x2="0" y2="60" stroke="#be185d" strokeWidth="2.5" />
      <circle cx="0" cy="78" r="22" fill="url(#gemGrad)" stroke="#831843" strokeWidth="2" />
      <circle cx="-6" cy="72" r="6" fill="white" opacity="0.45" />
    </g>
  </svg>
);

const NecklaceSVG = ({ style }: { style: CSSProperties }) => (
  <svg style={style} viewBox="0 0 360 220" className="pointer-events-none drop-shadow-lg">
    <defs>
      <linearGradient id="chainGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f9a8d4" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
      <radialGradient id="pendGrad">
        <stop offset="0%" stopColor="#fdf2f8" />
        <stop offset="55%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#7e22ce" />
      </radialGradient>
    </defs>
    {/* Chain arc */}
    <path d="M30 30 Q180 180 330 30" fill="none" stroke="url(#chainGrad)" strokeWidth="5" strokeLinecap="round" />
    {/* Beads */}
    {[60, 100, 140, 180, 220, 260, 300].map((x, i) => (
      <circle key={i} cx={x} cy={30 + Math.sin((i / 6) * Math.PI) * 0} r="4" fill="#f472b6" opacity="0.8" />
    ))}
    {/* Pendant */}
    <g transform="translate(180,130)">
      <line x1="0" y1="-18" x2="0" y2="0" stroke="#be185d" strokeWidth="3" />
      <ellipse cx="0" cy="20" rx="26" ry="32" fill="url(#pendGrad)" stroke="#831843" strokeWidth="2.5" />
      <ellipse cx="-8" cy="10" rx="8" ry="12" fill="white" opacity="0.35" />
    </g>
  </svg>
);

export const ACCESSORIES: AccessoryAsset[] = [
  {
    kind: 'glasses',
    label: 'Sunglasses',
    emoji: '🕶️',
    render: (style) => <GlassesSVG style={style} />,
  },
  {
    kind: 'earrings',
    label: 'Earrings',
    emoji: '💎',
    render: (style) => <EarringsSVG style={style} />,
  },
  {
    kind: 'necklace',
    label: 'Necklace',
    emoji: '📿',
    render: (style) => <NecklaceSVG style={style} />,
  },
];
