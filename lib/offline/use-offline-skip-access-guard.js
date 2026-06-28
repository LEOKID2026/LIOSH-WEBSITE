import { useRouter } from "next/router";

/** True on /student/offline/{game} same-device routes — skip GameAccessGuard. */
export function useOfflineSkipGameAccessGuard() {
  const router = useRouter();
  const path = String(router.pathname || "");
  if (!path.startsWith("/student/offline/")) return false;
  if (path === "/student/offline") return false;
  if (path.startsWith("/student/offline/solo")) return false;
  if (path.startsWith("/student/offline/educational")) return false;
  return true;
}
