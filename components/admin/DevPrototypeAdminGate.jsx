import { useAdminSession } from "../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING } from "../../lib/admin-portal/admin-ui.he.js";

/** Blocks /dev/* prototype routes unless the viewer is a platform admin. */
export default function DevPrototypeAdminGate({ children }) {
  const { state } = useAdminSession({ redirectTo: "/" });

  if (state === "loading") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-white/70 text-sm" dir="rtl" lang="he">
        {ADMIN_LOADING}
      </div>
    );
  }

  if (state !== "ready") {
    return null;
  }

  return children;
}
