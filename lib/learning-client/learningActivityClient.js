import { isDemoMode } from "../demo/demo-mode.client.js";
import {
  assertDemoPlayAllowed,
  DEMO_TIME_EXPIRED_CODE,
} from "../demo/demo-play-guard.client.js";

/** @type {{ sessionId: string, payload: object } | null} */
let demoLearningSession = null;

async function postLearningJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.error ? String(data.error) : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function demoSessionId() {
  return `demo-learning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function startLearningSession(payload) {
  if (isDemoMode()) {
    if (!assertDemoPlayAllowed()) {
      const err = new Error("demo_time_expired");
      err.code = DEMO_TIME_EXPIRED_CODE;
      throw err;
    }
    const sessionId = demoSessionId();
    demoLearningSession = { sessionId, payload: { ...payload } };
    return {
      ok: true,
      demo: true,
      sessionId,
      startedAt: new Date().toISOString(),
    };
  }
  return postLearningJson("/api/learning/session/start", payload);
}

export async function saveLearningAnswer(payload) {
  if (isDemoMode()) {
    return {
      ok: true,
      demo: true,
      sessionId: demoLearningSession?.sessionId || payload?.sessionId,
      ...payload,
    };
  }
  return postLearningJson("/api/learning/answer", payload);
}

export async function finishLearningSession(payload) {
  if (isDemoMode()) {
    const result = {
      ok: true,
      demo: true,
      sessionId: demoLearningSession?.sessionId || payload?.sessionId,
      ...payload,
    };
    demoLearningSession = null;
    return result;
  }
  return postLearningJson("/api/learning/session/finish", payload);
}
