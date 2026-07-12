import { useEffect, useState } from "react";

/** True when viewport width is below Tailwind `md` (768px). */
export function useMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobileViewport;
}
