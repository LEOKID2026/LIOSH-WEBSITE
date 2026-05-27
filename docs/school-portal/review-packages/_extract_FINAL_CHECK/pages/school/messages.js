import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import SchoolPortalShell from "../../components/school-portal/SchoolPortalShell";
import { SchoolErrorBlock, SchoolLoadingBlock } from "../../components/school-portal/SchoolDrillDown";
import { SchoolPrimaryButton, SchoolSection } from "../../components/school-portal/SchoolPortalUi";
import { useSchoolPortalLoad } from "../../lib/school-portal/use-school-portal-session";
import {
  SC_AUDIENCE_ALL_PARENTS,
  SC_AUDIENCE_ALL_TEACHERS,
  SC_AUDIENCE_CLASS_PARENTS,
  SC_AUDIENCE_CLASS_TEACHERS,
  SC_AUDIENCE_GRADE_PARENTS,
  SC_AUDIENCE_GRADE_TEACHERS,
  SC_AUDIENCE_SUBJECT_TEACHERS,
  SC_BTN_COMPOSE,
  SC_COL_AUDIENCE,
  SC_COL_DATE,
  SC_COL_READ_COUNT,
  SC_COL_SUBJECT,
  SC_COMPOSE_BTN_CANCEL,
  SC_COMPOSE_BTN_SEND,
  SC_COMPOSE_FIELD_AUDIENCE,
  SC_COMPOSE_FIELD_BODY,
  SC_COMPOSE_FIELD_SUBJECT,
  SC_COMPOSE_FIELD_TYPE,
  SC_COMPOSE_PREVIEW_COUNT,
  SC_COMPOSE_TITLE,
  SC_FILTER_ALL,
  SC_FILTER_PARENTS,
  SC_FILTER_TEACHERS,
  SC_MESSAGES_EMPTY,
  SC_PAGE_MESSAGES_TITLE,
  SC_RECEIPTS_PANEL_TITLE,
  SC_RECEIPTS_READ_COUNT,
  SC_RECEIPTS_STATUS_READ,
  SC_RECEIPTS_STATUS_UNREAD,
  SC_RECEIPTS_TAB_PARENTS,
  SC_RECEIPTS_TAB_TEACHERS,
} from "../../lib/school-portal/school-communication.he";
import {
  formatSchoolMessageAudienceLabel,
  formatSchoolMessageListReadCount,
  getSchoolMessageId,
  schoolMessageHasParentRecipients,
  schoolMessageHasTeacherRecipients,
  schoolMessageReadCountForTab,
} from "../../lib/school-portal/school-messaging-ui";
import { apiErrorMessageHe, schoolAuthFetch } from "../../lib/school-portal/school-ui.he";

const AUDIENCE_OPTIONS = [
  { value: "all_parents", label: SC_AUDIENCE_ALL_PARENTS },
  { value: "all_teachers", label: SC_AUDIENCE_ALL_TEACHERS },
  { value: "grade_parents", label: SC_AUDIENCE_GRADE_PARENTS, needsGrade: true },
  { value: "class_parents", label: SC_AUDIENCE_CLASS_PARENTS, needsGrade: true, needsClass: true },
  { value: "grade_teachers", label: SC_AUDIENCE_GRADE_TEACHERS, needsGrade: true },
  { value: "subject_teachers", label: SC_AUDIENCE_SUBJECT_TEACHERS, needsSubject: true },
  { value: "class_teachers", label: SC_AUDIENCE_CLASS_TEACHERS, needsGrade: true, needsClass: true },
];

export default function SchoolMessagesPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [receiptTab, setReceiptTab] = useState("parent");
  const [recipients, setRecipients] = useState([]);

  const [audienceType, setAudienceType] = useState("all_parents");
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalClassName, setPhysicalClassName] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [messageType, setMessageType] = useState("regular");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewCount, setPreviewCount] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const loadMessages = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const q = filter !== "all" ? `?recipientType=${filter}` : "";
      const res = await schoolAuthFetch(accessToken, `/api/school/messages${q}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "שגיאה בטעינת הודעות"));
        return;
      }
      setMessages(json.data?.messages || []);
    } catch {
      setError("שגיאה בטעינת הודעות");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    if (state === "ready") void loadMessages();
  }, [state, loadMessages]);

  const loadDetail = async (rawMessageId, preferredReceiptTab) => {
    const messageId = getSchoolMessageId({ messageId: rawMessageId, id: rawMessageId });
    if (!accessToken || !messageId) return;
    setDetailId(messageId);
    const res = await schoolAuthFetch(accessToken, `/api/school/messages/${messageId}`);
    const json = await res.json().catch(() => ({}));
    let tab = preferredReceiptTab || receiptTab;
    if (res.ok) {
      const data = json.data;
      setDetail(data);
      if (!preferredReceiptTab) {
        if (schoolMessageHasParentRecipients(data)) tab = "parent";
        else if (schoolMessageHasTeacherRecipients(data)) tab = "teacher";
        setReceiptTab(tab);
      }
    }
    const recRes = await schoolAuthFetch(
      accessToken,
      `/api/school/messages/${messageId}/recipients?recipientType=${tab}`
    );
    const recJson = await recRes.json().catch(() => ({}));
    if (recRes.ok) setRecipients(recJson.data?.recipients || []);
  };

  useEffect(() => {
    if (detailId) void loadDetail(detailId, receiptTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, receiptTab]);

  const audienceScope = () => {
    const scope = {};
    if (gradeLevel) scope.gradeLevel = gradeLevel;
    if (physicalClassName) scope.physicalClassName = physicalClassName;
    if (subjectKey) scope.subjectKey = subjectKey;
    return scope;
  };

  const refreshPreview = async () => {
    if (!accessToken) return;
    const params = new URLSearchParams({ audienceType, ...audienceScope() });
    const res = await schoolAuthFetch(
      accessToken,
      `/api/school/messages/audience-preview?${params}`
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok) setPreviewCount(json.data?.recipientCount ?? 0);
  };

  useEffect(() => {
    if (composeOpen) void refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeOpen, audienceType, gradeLevel, physicalClassName, subjectKey]);

  const sendMessage = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceType,
          audienceScope: audienceScope(),
          messageType,
          subject: subject || null,
          body,
        }),
      });
      if (!res.ok) return;
      setComposeOpen(false);
      setBody("");
      setSubject("");
      void loadMessages();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <SchoolPortalShell title={SC_PAGE_MESSAGES_TITLE} schoolName={me?.school?.name}>
        {state !== "ready" ? (
          <SchoolLoadingBlock message="טוען…" />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex gap-2 text-sm">
                {[SC_FILTER_ALL, SC_FILTER_PARENTS, SC_FILTER_TEACHERS].map((label, i) => {
                  const key = ["all", "parent", "teacher"][i];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={
                        filter === key
                          ? "rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1"
                          : "rounded-lg border border-white/15 px-3 py-1 text-white/70"
                      }
                      onClick={() => setFilter(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <SchoolPrimaryButton onClick={() => setComposeOpen(true)}>{SC_BTN_COMPOSE}</SchoolPrimaryButton>
            </div>

            {error ? <SchoolErrorBlock message={error} onRetry={() => void loadMessages()} /> : null}
            {loading ? (
              <SchoolLoadingBlock message="טוען…" />
            ) : messages.length ? (
              <div className="overflow-x-auto rounded-xl border border-white/15">
                <table className="w-full text-sm text-right">
                  <thead className="text-white/50 border-b border-white/10">
                    <tr>
                      <th className="p-3">{SC_COL_SUBJECT}</th>
                      <th className="p-3">{SC_COL_AUDIENCE}</th>
                      <th className="p-3">{SC_COL_DATE}</th>
                      <th className="p-3">{SC_COL_READ_COUNT}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m) => {
                      const messageId = getSchoolMessageId(m);
                      return (
                        <tr
                          key={messageId || m.subject}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => messageId && void loadDetail(messageId)}
                        >
                          <td className="p-3">{m.subject || "—"}</td>
                          <td className="p-3">
                            {formatSchoolMessageAudienceLabel(m.audienceType, m.audienceScope)}
                          </td>
                          <td className="p-3">
                            {m.sentAt ? new Date(m.sentAt).toLocaleDateString("he-IL") : "—"}
                          </td>
                          <td className="p-3">{formatSchoolMessageListReadCount(m)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-white/50 text-sm text-right">{SC_MESSAGES_EMPTY}</p>
            )}

            {composeOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-[#1a1208] p-5 text-right max-h-[90vh] overflow-y-auto">
                  <h2 className="text-lg font-bold mb-4">{SC_COMPOSE_TITLE}</h2>
                  <div className="space-y-3 text-sm">
                    <label className="block">
                      {SC_COMPOSE_FIELD_AUDIENCE}
                      <select
                        value={audienceType}
                        onChange={(e) => setAudienceType(e.target.value)}
                        className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                      >
                        {AUDIENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {AUDIENCE_OPTIONS.find((o) => o.value === audienceType)?.needsGrade ? (
                      <label className="block">
                        שכבה
                        <input
                          value={gradeLevel}
                          onChange={(e) => setGradeLevel(e.target.value)}
                          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                        />
                      </label>
                    ) : null}
                    {AUDIENCE_OPTIONS.find((o) => o.value === audienceType)?.needsClass ? (
                      <label className="block">
                        כיתה
                        <input
                          value={physicalClassName}
                          onChange={(e) => setPhysicalClassName(e.target.value)}
                          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                        />
                      </label>
                    ) : null}
                    {AUDIENCE_OPTIONS.find((o) => o.value === audienceType)?.needsSubject ? (
                      <label className="block">
                        מקצוע
                        <input
                          value={subjectKey}
                          onChange={(e) => setSubjectKey(e.target.value)}
                          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                        />
                      </label>
                    ) : null}
                    {previewCount != null ? (
                      <p className="text-amber-200/80 text-xs">{SC_COMPOSE_PREVIEW_COUNT(previewCount)}</p>
                    ) : null}
                    <label className="block">
                      {SC_COMPOSE_FIELD_TYPE}
                      <select
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value)}
                        className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                      >
                        <option value="regular">רגיל</option>
                        <option value="important">חשוב</option>
                        <option value="urgent">דחוף</option>
                        <option value="requires_confirmation">דורש אישור</option>
                      </select>
                    </label>
                    <label className="block">
                      {SC_COMPOSE_FIELD_SUBJECT}
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                      />
                    </label>
                    <label className="block">
                      {SC_COMPOSE_FIELD_BODY}
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={5}
                        className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-2"
                        required
                      />
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end mt-4">
                    <button type="button" className="px-3 py-2 text-sm" onClick={() => setComposeOpen(false)}>
                      {SC_COMPOSE_BTN_CANCEL}
                    </button>
                    <SchoolPrimaryButton disabled={busy || !body.trim()} onClick={() => void sendMessage()}>
                      {SC_COMPOSE_BTN_SEND}
                    </SchoolPrimaryButton>
                  </div>
                </div>
              </div>
            ) : null}

            {detail ? (
              <SchoolSection title={detail.subject || SC_RECEIPTS_PANEL_TITLE}>
                <p className="text-xs text-white/50 mb-2">
                  {formatSchoolMessageAudienceLabel(detail.audienceType, detail.audienceScope)}
                  {detail.sentAt
                    ? ` · ${new Date(detail.sentAt).toLocaleString("he-IL")}`
                    : ""}
                </p>
                <p className="text-sm text-white/85 whitespace-pre-wrap mb-3">{detail.body || "—"}</p>
                <p className="text-sm text-amber-200 mb-3">
                  {SC_RECEIPTS_READ_COUNT(
                    schoolMessageReadCountForTab(receiptTab, detail).read,
                    schoolMessageReadCountForTab(receiptTab, detail).total
                  )}
                  {detail.recipientCount != null ? ` · ${detail.recipientCount} נמענים` : ""}
                </p>
                {schoolMessageHasParentRecipients(detail) || schoolMessageHasTeacherRecipients(detail) ? (
                  <div className="flex gap-2 mb-3">
                    {schoolMessageHasParentRecipients(detail) ? (
                      <button
                        type="button"
                        className={receiptTab === "parent" ? "text-amber-200 font-semibold" : "text-white/60"}
                        onClick={() => setReceiptTab("parent")}
                      >
                        {SC_RECEIPTS_TAB_PARENTS}
                      </button>
                    ) : null}
                    {schoolMessageHasTeacherRecipients(detail) ? (
                      <button
                        type="button"
                        className={receiptTab === "teacher" ? "text-amber-200 font-semibold" : "text-white/60"}
                        onClick={() => setReceiptTab("teacher")}
                      >
                        {SC_RECEIPTS_TAB_TEACHERS}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                  {recipients.map((r) => (
                    <li
                      key={r.recipientId || `${r.recipientType}-${r.guardianAccessId || r.recipientUserId}`}
                      className="flex justify-between gap-2 border-b border-white/5 py-1"
                    >
                      <span>{r.displayName || r.recipientId || "—"}</span>
                      <span className={r.isRead ? "text-emerald-300" : "text-white/45"}>
                        {r.isRead ? SC_RECEIPTS_STATUS_READ : SC_RECEIPTS_STATUS_UNREAD}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 text-sm text-white/60 underline"
                  onClick={() => {
                    setDetail(null);
                    setDetailId(null);
                    setRecipients([]);
                  }}
                >
                  סגירה
                </button>
              </SchoolSection>
            ) : null}
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
