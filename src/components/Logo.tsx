/** Inline app mark — same artwork as public/bemore.svg, embedded so it renders
 *  regardless of base path or hosting. A lowercase b whose ascender rises into
 *  an arrow: be more. */
export default function Logo({ className = 'h-6 w-6 rounded-md' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bemore-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#5e5ce6" />
          <stop offset="1" stopColor="#0a84ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#bemore-g)" />
      <g fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 52 V13" />
        <path d="M15 20 L23 12 L31 20" />
        <circle cx="33.5" cy="41" r="10.5" />
      </g>
    </svg>
  )
}
