/**
 * Browser helpers for parent Terms + Privacy acceptance API.
 */

export async function fetchPolicyAcceptanceStatus(accessToken) {
  const res = await fetch("/api/parent/policy-acceptance/status", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await res.json();
  return { ok: res.ok, status: res.status, payload };
}

/**
 * @param {string} accessToken
 * @param {{ termsVersion: string; privacyVersion: string; source?: string }} body
 */
export async function postPolicyAcceptance(accessToken, body) {
  const res = await fetch("/api/parent/policy-acceptance/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json();
  return { ok: res.ok, status: res.status, payload };
}
