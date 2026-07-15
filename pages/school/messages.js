import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import SchoolPortalShell from "../../components/school-portal/SchoolPortalShell";
import { SchoolErrorBlock, SchoolLoadingBlock } from "../../components/school-portal/SchoolDrillDown";
import {
  SchoolPrimaryButton,
  SCHOOL_PORTAL_BTN_CURSOR,
  SCHOOL_PORTAL_MODAL_SCROLL_CLASS,
} from "../../components/school-portal/SchoolPortalUi";
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
  SC_COL_ACTION,
  SC_COL_READ_COUNT,
  SC_COL_SUBJECT,
  SC_FILTER_CUSTOM_RANGE,
  SC_FILTER_LAST_7_DAYS,
  SC_FILTER_LAST_30_DAYS,
  SC_LABEL_DATE_FROM,
  SC_LABEL_DATE_TO,
  SC_BTN_OPEN,
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
} from "../../lib/school-portal/school-communication.he";
import SchoolInboxMessageCard from "../../components/school-portal/SchoolInboxMessageCard";
import SchoolManagerMessageDetailContent from "../../components/school-portal/SchoolManagerMessageDetailContent";
import SchoolMessageDetailModal from "../../components/school-portal/SchoolMessageDetailModal";
import {
  buildSchoolMessagesListQuery,
  formatSchoolMessageAudienceLabel,
  formatSchoolMessageListReadCount,
  getSchoolMessageId,
  schoolMessageHasParentRecipients,
  schoolMessageHasTeacherRecipients,
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
  const [dateFilter, setDateFilter] = useState("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
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
      const q = buildSchoolMessagesListQuery({
        recipientType: filter,
        dateFilter,
        customFrom,
        customTo,
      });
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
  }, [accessToken, filter, dateFilter, customFrom, customTo]);

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

  const closeMessageDetail = () => {
    setDetail(null);
    setDetailId(null);
    setRecipients([]);
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
              <div className="flex flex-wrap gap-2 text-sm">
                {[SC_FILTER_ALL, SC_FILTER_PARENTS, SC_FILTER_TEACHERS].map((label, i) => {
                  const key = ["all", "parent", "teacher"][i];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={
                        filter === key
                          ? `rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1 ${SCHOOL_PORTAL_BTN_CURSOR}`
                          : `rounded-lg border border-white/15 px-3 py-1 text-white/70 hover:text-white/90 ${SCHOOL_PORTAL_BTN_CURSOR}`
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

            <div className="flex flex-wrap gap-2 text-sm items-end">
              {[
                { key: "7", label: SC_FILTER_LAST_7_DAYS },
                { key: "30", label: SC_FILTER_LAST_30_DAYS },
                { key: "custom", label: SC_FILTER_CUSTOM_RANGE },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={
                    dateFilter === key
                      ? `rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1 ${SCHOOL_PORTAL_BTN_CURSOR}`
                      : `rounded-lg border border-white/15 px-3 py-1 text-white/70 hover:text-white/90 ${SCHOOL_PORTAL_BTN_CURSOR}`
                  }
                  onClick={() => setDateFilter(key)}
                >
                  {label}
                </button>
              ))}
              {dateFilter === "custom" ? (
                <div className="flex flex-wrap gap-2 items-end w-full sm:w-auto">
                  <label className="text-xs text-white/60">
                    {SC_LABEL_DATE_FROM}
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="mt-1 block rounded bg-black/40 border border-white/20 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-white/60">
                    {SC_LABEL_DATE_TO}
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="mt-1 block rounded bg-black/40 border border-white/20 px-2 py-1 text-sm"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            {error ? <SchoolErrorBlock message={error} onRetry={() => void loadMessages()} /> : null}
            {loading ? (
              <SchoolLoadingBlock message="טוען…" />
            ) : messages.length ? (
              <>
                <ul className="md:hidden space-y-3">
                  {messages.map((m) => {
                    const messageId = getSchoolMessageId(m);
                    return (
                      <li key={messageId || m.subject}>
                        <SchoolInboxMessageCard
                          message={m}
                          messageId={messageId}
                          onOpen={() => messageId && void loadDetail(messageId)}
                          metaLine={formatSchoolMessageAudienceLabel(m.audienceType, m.audienceScope)}
                          readCountLine={formatSchoolMessageListReadCount(m)}
                        />
                      </li>
                    );
                  })}
                </ul>
                <div className="hidden md:block overflow-x-auto rounded-xl border border-white/15">
                  <table className="w-full text-sm text-right">
                    <thead className="text-white/50 border-b border-white/10">
                      <tr>
                        <th className="p-3">{SC_COL_SUBJECT}</th>
                        <th className="p-3">{SC_COL_AUDIENCE}</th>
                        <th className="p-3">{SC_COL_DATE}</th>
                        <th className="p-3">{SC_COL_READ_COUNT}</th>
                        <th className="p-3">{SC_COL_ACTION}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((m) => {
                        const messageId = getSchoolMessageId(m);
                        return (
                          <tr key={messageId || m.subject} className="border-b border-white/5">
                            <td className="p-3">{m.subject || "-"}</td>
                            <td className="p-3">
                              {formatSchoolMessageAudienceLabel(m.audienceType, m.audienceScope)}
                            </td>
                            <td className="p-3">
                              {m.sentAt ? new Date(m.sentAt).toLocaleDateString("he-IL") : "-"}
                            </td>
                            <td className="p-3">{formatSchoolMessageListReadCount(m)}</td>
                            <td className="p-3">
                              <button
                                type="button"
                                disabled={!messageId}
                                className={`rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50 ${SCHOOL_PORTAL_BTN_CURSOR}`}
                                onClick={() => messageId && void loadDetail(messageId)}
                              >
                                {SC_BTN_OPEN}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-white/50 text-sm text-right">{SC_MESSAGES_EMPTY}</p>
            )}

            {composeOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                <div
                  className={`w-full max-w-lg rounded-xl border border-amber-500/30 bg-[#1a1208] p-5 text-right max-h-[90vh] overflow-y-auto ${SCHOOL_PORTAL_MODAL_SCROLL_CLASS}`}
                >
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
                    <button
                      type="button"
                      className={`px-3 py-2 text-sm ${SCHOOL_PORTAL_BTN_CURSOR}`}
                      onClick={() => setComposeOpen(false)}
                    >
                      {SC_COMPOSE_BTN_CANCEL}
                    </button>
                    <SchoolPrimaryButton disabled={busy || !body.trim()} onClick={() => void sendMessage()}>
                      {SC_COMPOSE_BTN_SEND}
                    </SchoolPrimaryButton>
                  </div>
                </div>
              </div>
            ) : null}

            <SchoolMessageDetailModal open={Boolean(detail)} onClose={closeMessageDetail}>
              <SchoolManagerMessageDetailContent
                detail={detail}
                recipients={recipients}
                receiptTab={receiptTab}
                onReceiptTabChange={setReceiptTab}
              />
            </SchoolMessageDetailModal>
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
