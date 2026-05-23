/**
 * Browser helpers for parent Terms + Privacy acceptance API.
 * Never parses HTML error pages as JSON (fail-closed client).
 */

const POLICY_STATUS_UNAVAILABLE_HE =
  "לא ניתן לבדוק כרגע את אישור תנאי השימוש ומדיניות הפרטיות. נסו שוב בעוד רגע.";

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

async function readJsonResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      status: res.status,
      error: POLICY_STATUS_UNAVAILABLE_HE,
      payload: null,
    };
  }

  let payload;
  try {
    payload = await res.json();
  } catch (_e) {
    return {
      ok: false,
      status: res.status,
      error: POLICY_STATUS_UNAVAILABLE_HE,
      payload: null,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof payload?.error === "string" ? payload.error : POLICY_STATUS_UNAVAILABLE_HE,
      payload,
    };
  }

  return { ok: true, status: res.status, error: "", payload };
}

async function requestPolicyApi(accessToken, url, init) {
  if (!accessToken) {
    return { ok: false, status: 401, error: POLICY_STATUS_UNAVAILABLE_HE, payload: null };
  }

  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders(accessToken),
        ...(init?.headers || {}),
      },
    });
  } catch (_e) {
    return { ok: false, status: 0, error: POLICY_STATUS_UNAVAILABLE_HE, payload: null };
  }

  return readJsonResponse(res);
}

export async function fetchPolicyAcceptanceStatus(accessToken) {
  return requestPolicyApi(accessToken, "/api/parent/policy-acceptance/status", { method: "GET" });
}

/**
 * @param {string} accessToken
 * @param {{ termsVersion: string; privacyVersion: string; source?: string; locale?: string }} body
 */
export async function postPolicyAcceptance(accessToken, body) {
  return requestPolicyApi(accessToken, "/api/parent/policy-acceptance/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

export { POLICY_STATUS_UNAVAILABLE_HE };
