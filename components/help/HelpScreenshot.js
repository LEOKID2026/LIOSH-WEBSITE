import { useState } from "react";

const ALLOW_MISSING =
  process.env.NEXT_PUBLIC_HELP_CENTER_ALLOW_MISSING_SCREENSHOTS === "1" ||
  process.env.HELP_CENTER_ALLOW_MISSING_SCREENSHOTS === "1";

export default function HelpScreenshot({ path, alt, caption, sources }) {
  const [failed, setFailed] = useState(false);
  const mobile = sources?.mobile || path;
  const tablet = sources?.tablet || path;

  if (!path || !alt?.trim()) return null;

  if (failed && ALLOW_MISSING) {
    return (
      <figure className="my-6 rounded-xl border border-dashed border-white/20 bg-black/40 p-6 text-center text-white/50 text-sm">
        <figcaption>{caption || alt}</figcaption>
        <p className="mt-2">תמונת מסך תתווסף בקרוב</p>
      </figure>
    );
  }

  if (failed) {
    return (
      <figure className="my-6 rounded-xl border border-amber-500/30 bg-black/50 p-4 text-amber-200/80 text-sm text-right">
        <figcaption>{caption || alt}</figcaption>
        <p className="mt-2">לא ניתן לטעון את תמונת המסך</p>
      </figure>
    );
  }

  return (
    <figure className="my-6 text-right">
      <picture>
        <source media="(max-width: 640px)" srcSet={mobile} />
        <source media="(max-width: 1023px)" srcSet={tablet} />
        <img
          src={path}
          alt={alt}
          width={1366}
          height={768}
          loading="lazy"
          decoding="async"
          className="w-full h-auto rounded-xl border border-white/10 shadow-lg"
          onError={() => setFailed(true)}
        />
      </picture>
      {caption ? (
        <figcaption className="mt-2 text-sm text-white/65">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
