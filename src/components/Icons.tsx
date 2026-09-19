/**
 * One icon set, one 24x24 viewBox, stroke-based (Lucide geometry).
 * Never emojis — they render inconsistently and carry no accessible name.
 * Icons are decorative here: the label next to them is the accessible text,
 * so they are marked aria-hidden.
 */
type IconProps = { className?: string };

function base(className?: string) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: className ?? 'h-5 w-5',
  };
}

export const Icons = {
  dashboard: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  studio: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m10 9.5 5 2.5-5 2.5z" />
    </svg>
  ),
  agents: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <circle cx="12" cy="7" r="3" />
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      <path d="M12 10v3M12 13 7 15M12 13l5 2" />
    </svg>
  ),
  calendar: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  jobs: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="M12 3a9 9 0 1 1-6.36 2.64" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  assets: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </svg>
  ),
  brand: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="m12 3 2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.4l6-.9z" />
    </svg>
  ),
  analytics: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="M4 19V5M4 19h16" />
      <path d="m7.5 15 3.5-4 3 2.5 4.5-6" />
    </svg>
  ),
  settings: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.14 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.04z" />
    </svg>
  ),
  plus: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  ),
  alert: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </svg>
  ),
  arrowRight: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  logout: ({ className }: IconProps) => (
    <svg {...base(className)}>
      <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
