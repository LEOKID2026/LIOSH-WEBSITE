import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import ParentMustChangePinGate from "../../components/parent/ParentMustChangePinGate";
import {
  SC_BTN_MARK_RECEIVED,
  SC_INBOX_EMPTY,
  SC_INBOX_TITLE_PARENT,
} from "../../lib/school-portal/school-communication.he";

export default function ParentSchoolInboxPage() {
  const router = useRouter();
  const [mustChangePin, setMustChangePin] = useState(false);
  const [pinGateDone, setPinGateDone] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInbox = async () => {
    setLoading(true);
    const me = await fetch("/api/guardian/me", { credentials: "same-origin", cache: "no-store" });
    if (me.status === 401) {
      router.replace("/parent/login");
      return;
    }
    const meBody = await me.json().catch(() => ({}));
    if (!meBody?.data?.isSchoolLinked) {
      router.replace("/guardian/view");
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

  const openMessage = async (id) => {
    const res = await fetch(`/api/guardian/school-messages/${encodeURIComponent(id)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setSelected(body.data);
  };

  const markRead = async (id, requiresConfirmation) => {
    await fetch(`/api/guardian/school-messages/${encodeURIComponent(id)}/read`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: Boolean(requiresConfirmation) }),
    });
    void loadInbox();
    if (selected?.message?.id === id) void openMessage(id);
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

  return (
    <Layout>
      <TeacherPortalShell title={SC_INBOX_TITLE_PARENT}>
        <div className="mb-4">
          <Link href="/guardian/view" className="text-sm text-amber-300 hover:underline">
            ← חזרה לדוח
          </Link>
        </div>
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
          <p className="text-white/50 text-sm">{SC_INBOX_EMPTY}</p>
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
