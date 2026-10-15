import { cn } from '@/lib/utils'

/** Illustration provisoire d'un camion sur route (en attendant les photographies officielles). */
export function TruckScene({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <svg viewBox="0 0 640 400" className={cn('h-full w-full', className)} role="img" aria-label="Camion de transport sur une route de campagne" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFE3F7" /><stop offset="1" stopColor="#EEF5FC" /></linearGradient>
        <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5E8C6A" /><stop offset="1" stopColor="#3F6B4E" /></linearGradient>
      </defs>
      <rect width="640" height="400" fill="url(#sky)" />
      <path d="M0 250 L90 150 L170 220 L260 120 L360 230 L450 160 L560 230 L640 180 V300 H0Z" fill="#8FB3D1" opacity=".7" />
      <path d="M0 290 Q120 210 260 270 T520 255 T640 275 V330 H0Z" fill="url(#hill1)" />
      <rect y="300" width="640" height="100" fill="#3A4656" />
      <path d="M0 352 H640" stroke="#fff" strokeWidth="4" strokeDasharray="34 26" opacity=".8" />
      {!compact && <g transform="translate(40 20)"><circle cx="480" cy="30" r="22" fill="#FFE9B8" /></g>}
      <g transform="translate(120 190)">
        <rect x="0" y="20" width="270" height="108" rx="6" fill="#E9EEF4" stroke="#B9C5D3" />
        <rect x="14" y="36" width="242" height="6" fill="#0B2A4A" opacity=".85" />
        <text x="135" y="86" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0B2A4A" fontFamily="Inter, sans-serif">MUTLOG</text>
        <path d="M280 52 h60 q12 0 20 12 l22 32 v32 h-102z" fill="#0B2A4A" />
        <path d="M300 64 h38 q6 0 10 6 l12 18 h-60z" fill="#BFD7EE" />
        <rect x="270" y="128" width="112" height="12" fill="#102033" />
        <circle cx="64" cy="140" r="20" fill="#102033" /><circle cx="64" cy="140" r="9" fill="#9AA7B6" />
        <circle cx="116" cy="140" r="20" fill="#102033" /><circle cx="116" cy="140" r="9" fill="#9AA7B6" />
        <circle cx="318" cy="140" r="20" fill="#102033" /><circle cx="318" cy="140" r="9" fill="#9AA7B6" />
        <rect x="372" y="116" width="10" height="8" rx="2" fill="#FF7A00" />
      </g>
    </svg>
  )
}
