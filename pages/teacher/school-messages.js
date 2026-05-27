import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import SchoolInboxMessageCard from "../../components/school-portal/SchoolInboxMessageCard";
import SchoolInboxMessageDetailContent from "../../components/school-portal/SchoolInboxMessageDetailContent";
import SchoolMessageDetailModal from "../../components/school-portal/SchoolMessageDetailModal";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import {
  SC_MESSAGE_FROM_SCHOOL_ADMIN,
  SC_TEACHER_INBOX_EMPTY,
  SC_TEACHER_INBOX_TITLE,
} from "../../lib/school-portal/school-communication.he";
import { getSchoolMessageId } from "../../lib/school-portal/school-messaging-ui";

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
  const [markBusy, setMarkBusy] = useState(false);

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

  const openMessage = async (message) => {
    const id = getSchoolMessageId(message);
    if (!accessToken || !id) return;
    const res = await teacherFetch(`/api/teacher/school-messages/${encodeURIComponent(id)}`, accessToken);
    const body = await res.json().catch(() => ({}));
    if (res.ok) setSelected(body.data);
  };

  const markRead = async (message, requiresConfirmation) => {
    const id = getSchoolMessageId(message);
    if (!accessToken || !id) return;
    setMarkBusy(true);
    try {
      await teacherFetch(`/api/teacher/school-messages/${encodeURIComponent(id)}/read`, accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: Boolean(requiresConfirmation) }),
      });
      await load(accessToken);
      void openMessage({ messageId: id });
    } finally {
      setMarkBusy(false);
    }
  };

  const selectedId = getSchoolMessageId(selected);
  const senderLine =
    schoolMembership?.schoolName?.trim() ||
    SC_MESSAGE_FROM_SCHOOL_ADMIN;

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
          <ul className="space-y-3">
            {messages.map((m) => {
              const messageId = getSchoolMessageId(m);
              return (
                <li key={messageId || m.subject}>
                  <SchoolInboxMessageCard
                    message={m}
                    messageId={messageId}
                    onOpen={openMessage}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-white/50 text-sm">{SC_TEACHER_INBOX_EMPTY}</p>
        )}

        <SchoolMessageDetailModal open={Boolean(selected && selectedId)} onClose={() => setSelected(null)}>
          <SchoolInboxMessageDetailContent
            message={selected}
            senderLine={senderLine}
            markBusy={markBusy}
            onMarkRead={markRead}
          />
        </SchoolMessageDetailModal>
      </TeacherPortalShell>
    </Layout>
  );
}
