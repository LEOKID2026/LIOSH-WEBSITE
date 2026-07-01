import { useEffect } from "react";
import { useRouter } from "next/router";

/** Parent home alias — dashboard is the authenticated parent landing page. */
export default function ParentHomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    router.replace("/parent/dashboard");
  }, [router]);

  return null;
}
