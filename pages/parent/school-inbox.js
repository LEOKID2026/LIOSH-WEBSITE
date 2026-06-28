import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import ParentMustChangePinGate from "../../components/parent/ParentMustChangePinGate";
import SchoolInboxMessageCard from "../../components/school-portal/SchoolInboxMessageCard";
import SchoolInboxMessageDetailContent from "../../components/school-portal/SchoolInboxMessageDetailContent";
import SchoolMessageDetailModal from "../../components/school-portal/SchoolMessageDetailModal";
import {
  SC_INBOX_EMPTY,
  SC_INBOX_TITLE_PARENT,
  SC_MESSAGE_FROM_SCHOOL_PARENT,
} from "../../lib/school-portal/school-communication.he";
import { getSchoolMessageId } from "../../lib/school-portal/school-messaging-ui";

export default function ParentSchoolInboxPage() {
  const router = useRouter();
  const [mustChangePin, setMustChangePin] = useState(false);
  const [pinGateDone, setPinGateDone] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markBusy, setMarkBusy] = useState(false);

  const loadInbox = async () => {
    setLoading(true);
    const me = await fetch("/api/guardian/me", { credentials: "same-origin", cache: "no-store" });
    if (me.status === 401) {
      router.replace("/parent/login");
      return;
    }
    const meBody = await me.json().catch(() => ({}));
    if (!meBody?.data?.isSchoolLinked) {
      router.replace("/parent/guardian/view");
      return;
    }
    setMustChangePin(Boolean(meBody?.data?.mustChangePin));
    setPinGateDone(!meBody?.data?.mustChangePin);

    const res = await fetch("/api/guardian/school-messages", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setMessages(body.data?.messages || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadInbox();
  }, [router]);

  const openMessage = async (message) => {
    const id = getSchoolMessageId(message);
    if (!id) return;
    const res = await fetch(`/api/guardian/school-messages/${encodeURIComponent(id)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setSelected(body.data);
  };

  const markRead = async (message, requiresConfirmation) => {
    const id = getSchoolMessageId(message);
    if (!id) return;
    setMarkBusy(true);
    try {
      await fetch(`/api/guardian/school-messages/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: Boolean(requiresConfirmation) }),
      });
      await loadInbox();
      if (getSchoolMessageId(selected) === id) void openMessage({ messageId: id });
    } finally {
      setMarkBusy(false);
    }
  };

  if (mustChangePin && !pinGateDone) {
    return (
      <Layout>
        <TeacherPortalShell title="שינוי קוד גישה">
          <ParentMustChangePinGate onSuccess={() => setPinGateDone(true)} />
        </TeacherPortalShell>
      </Layout>
    );
  }

  const selectedId = getSchoolMessageId(selected);

  return (
    <Layout>
      <TeacherPortalShell title={SC_INBOX_TITLE_PARENT}>
        <div className="mb-4">
          <Link href="/parent/guardian/view" className="text-sm text-amber-300 hover:underline cursor-pointer">
            ← חזרה לדוח
          </Link>
        </div>
        {loading ? (
          <p className="text-white/50 text-sm">טוען…</p>
        ) : messages.length ? (
          <ul className="space-y-3">
            {messages.map((m) => {
              const messageId = getSchoolMessageId(m);
              return (
                <li key={messageId || m.subject}>
                  <SchoolInboxMessageCard message={m} messageId={messageId} onOpen={openMessage} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-white/50 text-sm">{SC_INBOX_EMPTY}</p>
        )}

        <SchoolMessageDetailModal open={Boolean(selected && selectedId)} onClose={() => setSelected(null)}>
          <SchoolInboxMessageDetailContent
            message={selected}
            senderLine={SC_MESSAGE_FROM_SCHOOL_PARENT}
            markBusy={markBusy}
            onMarkRead={markRead}
          />
        </SchoolMessageDetailModal>
      </TeacherPortalShell>
    </Layout>
  );
}
