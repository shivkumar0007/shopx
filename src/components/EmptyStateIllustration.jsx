/** Minimal line-art style SVG for empty cart / wishlist (Apple-inspired, no heavy fills). */
export const EmptyCartIllustration = ({ className = "mx-auto mb-6 h-28 w-28 text-text/35" }) => (
  <svg
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1" />
    <path
      d="M38 48h44l-4 32H42L38 48z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d="M44 48V40a16 16 0 0 1 32 0v8" stroke="currentColor" strokeWidth="1.2" />
    <path d="M48 64h24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const EmptyWishlistIllustration = ({ className = "mx-auto mb-6 h-28 w-28 text-text/35" }) => (
  <svg
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1" />
    <path
      d="M60 44c-8-10-22-6-22 10 0 14 22 28 22 28s22-14 22-28c0-16-14-20-22-10z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);
