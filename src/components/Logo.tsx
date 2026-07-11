/** Inline app mark — same artwork as public/bemore.svg, but embedded so it
 *  renders correctly regardless of base path or hosting (subpath, single-file). */
export default function Logo({ className = 'h-6 w-6 rounded-md' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bemore-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5e5ce6" />
          <stop offset="1" stopColor="#0a84ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#bemore-g)" />
      <path d="M32 14 L36.8 27.2 L50 32 L36.8 36.8 L32 50 L27.2 36.8 L14 32 L27.2 27.2 Z" fill="#fff" />
    </svg>
  )
}
