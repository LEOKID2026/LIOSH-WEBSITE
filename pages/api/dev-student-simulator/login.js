import { guardDevOnlyApiRoute } from "../../../lib/security/api-guards.js";
import {
  isDevStudentSimulatorEnabled,
  verifyDevStudentSimulatorPassword,
  createSessionToken,
  setDevStudentSimulatorSessionCookie,
} from "../../../utils/server/dev-student-simulator-auth";

export default function handler(req, res) {
  if (guardDevOnlyApiRoute(req, res)) return;

  if (!isDevStudentSimulatorEnabled()) {
    res.status(404).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).setHeader("Allow", "POST").end();
    return;
  }

  const password =
    typeof req.body?.password === "string"
      ? req.body.password
      : typeof req.body === "string"
        ? ""
        : "";

  if (!verifyDevStudentSimulatorPassword(password)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const token = createSessionToken();
  if (!token) {
    res.status(503).json({ ok: false, error: "session_unavailable" });
    return;
  }

  setDevStudentSimulatorSessionCookie(res, token);
  res.status(200).json({ ok: true });
}

export const config = {
  api: {
    bodyParser: true,
  },
};
