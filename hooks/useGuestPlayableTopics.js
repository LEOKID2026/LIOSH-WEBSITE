import { useEffect, useMemo, useState } from "react";

/**
 * Guest topic lock state for learning master pages.
 * @param {string} subject
 * @param {string[]} curriculumTopics
 */
export function useGuestPlayableTopics(subject, curriculumTopics) {
  const topicsKey = useMemo(() => {
    if (!Array.isArray(curriculumTopics)) return "";
    return curriculumTopics.join("\u0001");
  }, [curriculumTopics]);

  const [state, setState] = useState({
    loaded: false,
    isGuest: false,
    byTopic: new Map(),
  });

  useEffect(() => {
    if (!subject || !Array.isArray(curriculumTopics) || curriculumTopics.length === 0) {
      setState({ loaded: true, isGuest: false, byTopic: new Map() });
      return undefined;
    }

    let cancelled = false;
    const qs = new URLSearchParams({
      subject,
      topics: curriculumTopics.join(","),
    });

    fetch(`/api/student/guest/playable-topics?${qs.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.isGuest) {
          setState({ loaded: true, isGuest: false, byTopic: new Map() });
          return;
        }
        const byTopic = new Map();
        for (const row of data.topics || []) {
          if (row?.topic) byTopic.set(String(row.topic), row);
        }
        setState({ loaded: true, isGuest: true, byTopic });
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, isGuest: false, byTopic: new Map() });
      });

    return () => {
      cancelled = true;
    };
  }, [subject, topicsKey]);

  const isLocked = (topic) => {
    if (!state.isGuest) return false;
    return state.byTopic.get(String(topic))?.guestLocked === true;
  };

  const isPlayable = (topic) => {
    if (!state.isGuest) return true;
    return state.byTopic.get(String(topic))?.guestPlayable === true;
  };

  const label = (topic, baseLabel) => (isLocked(topic) ? `🔒 ${baseLabel}` : baseLabel);

  const firstPlayable = (topics, fallback) => {
    if (!state.isGuest) return fallback;
    const hit = (topics || []).find((t) => isPlayable(t));
    return hit || fallback;
  };

  return {
    loaded: state.loaded,
    isGuest: state.isGuest,
    isLocked,
    isPlayable,
    label,
    firstPlayable,
  };
}
