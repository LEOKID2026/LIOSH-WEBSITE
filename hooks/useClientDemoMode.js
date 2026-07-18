import { useEffect, useState } from "react";
import { isDemoMode } from "../lib/demo/demo-mode.client.js";

/** Demo flag safe for SSR — false until after mount, then reads localStorage. */
export function useClientDemoMode() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDemoMode());
  }, []);

  return active;
}
