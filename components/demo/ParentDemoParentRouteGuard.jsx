import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  hasParentDemoSession,
  readParentDemoSession,
} from "../../lib/demo/parent-demo-mode.client.js";
import { isParentDemoAccessibleRoute } from "../../lib/demo/parent-demo-routes.client.js";

/** Restricts /parent/* routes while parent demo session is active. */
export default function ParentDemoParentRouteGuard({ children }) {
  const router = useRouter();
  const pathname = router.pathname || "";

  useEffect(() => {
    if (!hasParentDemoSession()) {
      router.replace("/demo/parent/enter");
      return;
    }
    if (!isParentDemoAccessibleRoute(pathname)) {
      router.replace("/parent/dashboard");
    }
  }, [pathname, router]);

  if (!readParentDemoSession()) return null;

  return children;
}
