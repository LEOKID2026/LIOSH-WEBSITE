import { useEffect, useState } from "react";
import { isParentDemoMode } from "../lib/demo/parent-demo-mode.client.js";

/** SSR-safe parent demo flag. */
export function useClientParentDemoMode() {
  const [isDemo, setIsDemo] = useState(false);
  useEffect(() => {
    setIsDemo(isParentDemoMode());
  }, []);
  return isDemo;
}
