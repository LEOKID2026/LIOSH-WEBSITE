import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import {
  SC_BTN_MARK_RECEIVED,
  SC_TEACHER_INBOX_EMPTY,
  SC_TEACHER_INBOX_TITLE,
} from "../../lib/school-portal/school-communication.he";

async function teacherFetch(path, accessToken, init = {}) {
  return fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export default function TeacherSchoolMessagesPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState(null);
  const [schoolMembership, setSchoolMembership] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (token) => {
    if (!token) return;
    setLoading(true);
    const meRes = await teacherFetch("/api/teacher/me", token);
    const meBody = await meRes.json().catch(() => ({}));
    setSchoolMembership(meBody?.data?.schoolMembership || null);
    if (!meBody?.data?.schoolMembership?.schoolId) {
      router.replace("/teacher/dashboard");
      return;
    }

    const listRes = await teacherFetch("/api/teacher/school-messages", token);
    const listBody = await listRes.json().catch(() => ({}));
    if (listRes.ok) {
      setMessages(listBody.data?.messages || []);
      setUnreadCount(listBody.data?.unreadCount ?? 0);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getLearningSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session?.access_token) {
        router.replace("/teacher/login");
        return;
      }
      setAccessToken(data.session.access_token);
      await load(data.session.access_token);
    })();
    return () => {
      mounted = false;
    };
  }, [load, router]);

  const openMessage = async (id) => {
    if (!accessToken) return;
    const res = await teacherFetch(`/api/teacher/school-messages/${encodeURIComponent(id)}`, accessToken);
    const body = await res.json().catch(() => ({}));
    if (res.ok) setSelected(body.data);
  };

  const markRead = async (id, requiresConfirmation) => {
    if (!accessToken) return;
    await teacherFetch(`/api/teacher/school-messages/${encodeURIComponent(id)}/read`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: Boolean(requiresConfirmation) }),
    });
    await load(accessToken);
    void openMessage(id);
  };

  return (
    <Layout>
      <TeacherPortalShell
        title={SC_TEACHER_INBOX_TITLE}
        backHref="/teacher/dashboard"
        schoolMembership={schoolMembership}
        schoolMessageUnreadCount={unreadCount}
      >
        {loading ? (
          <p className="text-white/50 text-sm">טוען…</p>
        ) : messages.length ? (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full text-right rounded-lg border border-white/15 bg-white/5 p-3 hover:bg-white/10"
                  onClick={() => void openMessage(m.id)}
                >
                  <p className="font-semibold">{m.subject || "הודעה מבית הספר"}</p>
                  <p className="text-xs text-white/50">
                    {m.sentAt ? new Date(m.sentAt).toLocaleString("he-IL") : ""}
                    {!m.readAt ? " · חדש" : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-white/50 text-sm">{SC_TEACHER_INBOX_EMPTY}</p>
        )}

        {selected?.message ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-black/40 p-4 text-right">
            <h2 className="font-bold mb-2">{selected.message.subject || "הודעה"}</h2>
            <p className="text-sm whitespace-pre-wrap mb-4">{selected.message.body}</p>
            {!selected.readAt && selected.message.messageType === "requires_confirmation" ? (
              <button
                type="button"
                className="rounded-lg bg-amber-500 text-black px-4 py-2 text-sm font-semibold"
                onClick={() => void markRead(selected.message.id, true)}
              >
                {SC_BTN_MARK_RECEIVED}
              </button>
            ) : !selected.readAt ? (
              <button
                type="button"
                className="text-sm text-amber-300 underline"
                onClick={() => void markRead(selected.message.id, false)}
              >
                סמן כנקרא
              </button>
            ) : null}
          </div>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
