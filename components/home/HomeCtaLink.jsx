import Link from "next/link";

const SIZE = {
  lg: "w-full sm:w-auto min-h-[48px] px-6 py-3 text-base font-bold rounded-2xl",
  md: "min-h-[44px] px-5 py-2.5 text-sm font-bold rounded-xl",
};

/**
 * @param {{ href: string, label: string, className?: string, size?: 'lg'|'md', testId?: string }} props
 */
export default function HomeCtaLink({
  href,
  label,
  className = "",
  size = "lg",
  testId,
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${SIZE[size]} ${className}`}
      data-testid={testId}
    >
      {label}
    </Link>
  );
}
