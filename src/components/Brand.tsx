import { useId } from "react";
import { Link } from "react-router-dom";

/** Original bitmap from jebrix/assets/images/logo.png, without redrawing it. */
export function Logo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`official-logo ${className}`}
      src="/logo.png"
      alt="Jebryx"
      width={size}
      height={size}
    />
  );
}
export function Brand({
  to = "/",
  className = "",
}: {
  to?: string;
  className?: string;
}) {
  return (
    <Link className={`brand ${className}`} to={to}>
      <Logo size={39} />
      <span>Jebryx</span>
    </Link>
  );
}

/** Exact SVG artwork of JebryxAvatar in the mobile coach screen. */
export function CoachAvatar({ size = 40 }: { size?: number }) {
  const id = `coach${useId().replace(/:/g, "")}`;
  return (
    <svg
      className="coach-avatar"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Jebryx coach"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#137a60" />
          <stop offset="1" stopColor="#0d5f4a" />
        </linearGradient>
      </defs>
      <rect width={96} height={96} rx={28} fill={`url(#${id})`} />
      <g
        transform="translate(24 21) scale(2)"
        fill="none"
        stroke="#fff"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3.25 19.5 6v5c0 4.5-3.2 7.8-7.5 9.75C7.7 18.8 4.5 15.5 4.5 11V6l7.5-2.75Z" />
        <circle cx={9.75} cy={10.5} r={1.2} fill="#fff" stroke="none" />
        <circle cx={14.25} cy={10.5} r={1.2} fill="#fff" stroke="none" />
        <path d="M14 13.4v.7a2 2 0 0 1-4 0" />
      </g>
    </svg>
  );
}
