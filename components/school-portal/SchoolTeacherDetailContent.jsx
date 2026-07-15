import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SchoolCardGrid,
  SchoolManagementCard,
} from "./SchoolDrillDown";
import SchoolTeacherClassStudentsModal from "./SchoolTeacherClassStudentsModal";
import SchoolTeacherPhysicalClassPickerModal from "./SchoolTeacherPhysicalClassPickerModal";
import SchoolReportModal from "./SchoolReportModal";
import {
  SchoolPageIntro,
  SchoolPrimaryButton,
  SchoolSection,
  SchoolStatCard,
  SchoolSubjectBadges,
  SchoolEmptyState,
  SCHOOL_CARD,
  SCHOOL_CARD_INNER,
} from "./SchoolPortalUi";
import { useSchoolDataFetch } from "../../lib/school-portal/use-school-data-fetch";
import { fetchSchoolJsonSWR, readSchoolCache, SCHOOL_CACHE_TTL_MS } from "../../lib/school-portal/school-portal-cache";
import { fetchSchoolReportCached } from "../../lib/school-portal/fetch-school-report";
import {
  groupPhysicalClassesForTeacher,
  physicalClassGroupKey,
  physicalClassStudentCount,
  physicalClassSubjectLabelsHe,
  sortSubjectClasses,
} from "../../lib/school-portal/school-drilldown";
import { parseClassReportViewModel, parseStudentReportViewModel } from "../../lib/school-portal/school-report-view-model";
import SchoolSubjectSelect from "./SchoolSubjectSelect";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  schoolSubjectLabelHe,
  SCHOOL_BACK_TEACHERS,
  SCHOOL_CLASS_REPORT_TITLE,
  SCHOOL_COL_CLASSES,
  SCHOOL_COL_STUDENTS,
  SCHOOL_LOADING_DATA,
  SCHOOL_MANAGER_ALL_SUBJECTS,
  SCHOOL_REPORT_LOADING,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
  SCHOOL_SUBJECT_ADD,
  SCHOOL_SUBJECT_REMOVE,
  SCHOOL_SUBJECTS_TITLE,
  SCHOOL_TEACHER_CLASSES_TITLE,
  SCHOOL_TEACHER_CLASS_SUBJECTS_PREFIX,
  SCHOOL_TEACHER_EMPTY_CLASSES,
} from "../../lib/school-portal/school-ui.he";

/**
 * Full school teacher detail - shared by `/school/teachers/[teacherId]` and in-report modal.
 *
 * @param {{
 *   teacherId: string|null|undefined,
 *   accessToken: string|null,
 *   schoolId: string|null,
 *   schoolName?: string|null,
 *   showBackLink?: boolean,
 *   enabled?: boolean,
 *   modalStackBase?: number,
 *   onDetailLoaded?: (detail: object|null) => void,
 * }} props
 */
export default function SchoolTeacherDetailContent({
  teacherId,
  accessToken,
  schoolId,
  schoolName,
  showBackLink = false,
  enabled = true,
  modalStackBase = 0,
  onDetailLoaded,
}) {
  const [detail, setDetail] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("math");
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerGroup, setPickerGroup] = useState(null);

  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsCtx, setStudentsCtx] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportClass, setReportClass] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportViewModel, setReportViewModel] = useState(null);
  const [nestedStudentVm, setNestedStudentVm] = useState(null);
  const [studentReportLoading, setStudentReportLoading] = useState(false);
  const reportClassRef = useRef(null);

  const pickerZIndex = 100 + modalStackBase;
  const studentsZIndex = 110 + modalStackBase;
  const reportStackZIndexBase = modalStackBase;

  const parseClasses = useMemo(
    () => (body) => body?.data?.classes?.filter((c) => !c.isArchived) || [],
    []
  );

  const classesPath = useMemo(
    () =>
      teacherId && enabled
        ? `/api/school/classes?teacherId=${encodeURIComponent(teacherId)}&isArchived=false`
        : "",
    [teacherId, enabled]
  );

  const {
    data: teacherClasses,
    loading: classesLoading,
    error: classesError,
  } = useSchoolDataFetch(
    accessToken,
    schoolId,
    classesPath,
    parseClasses,
    Boolean(enabled && accessToken && teacherId),
    { cacheKind: "list" }
  );

  const physicalGroups = useMemo(
    () => (teacherClasses ? groupPhysicalClassesForTeacher(teacherClasses) : []),
    [teacherClasses]
  );

  const load = useCallback(async ({ force = false } = {}) => {
    if (!accessToken || !teacherId || !enabled) return;
    const detailPath = `/api/school/teachers/${teacherId}`;
    const subjectsPath = `/api/school/teachers/${teacherId}/subjects`;
    const cachedDetail = schoolId ? readSchoolCache(schoolId, detailPath) : null;
    const cachedSubjects = schoolId ? readSchoolCache(schoolId, subjectsPath) : null;
    if (cachedDetail?.data?.data?.teacher) {
      setDetail(cachedDetail.data.data.teacher);
      setDetailLoading(false);
    } else {
      setDetailLoading(true);
    }
    if (cachedSubjects?.data?.data?.subjects) {
      setSubjects(cachedSubjects.data.data.subjects);
    }
    setDetailError("");
    try {
      const [dResult, sResult] = await Promise.all([
        fetchSchoolJsonSWR({
          accessToken,
          schoolId,
          path: detailPath,
          ttlMs: SCHOOL_CACHE_TTL_MS.teacherDetail,
          force,
          fetchFn: schoolAuthFetch,
        }),
        fetchSchoolJsonSWR({
          accessToken,
          schoolId,
          path: subjectsPath,
          ttlMs: SCHOOL_CACHE_TTL_MS.teacherDetail,
          force,
          fetchFn: schoolAuthFetch,
        }),
      ]);
      const dBody = dResult?.body || {};
      const sBody = sResult?.body || {};
      if (dResult?.status === 200) {
        setDetail(dBody.data?.teacher);
        onDetailLoaded?.(dBody.data?.teacher || null);
      } else {
        setDetail(null);
        onDetailLoaded?.(null);
        setDetailError(dBody?.error?.message || "שגיאה בטעינת פרטי המורה");
      }
      if (sResult?.status === 200) {
        setSubjects(sBody.data?.subjects || []);
      } else if (dResult?.status === 200) {
        setSubjects([]);
      }
    } catch {
      setDetailError("שגיאת רשת בטעינת פרטי המורה");
    } finally {
      setDetailLoading(false);
    }
  }, [accessToken, schoolId, teacherId, enabled, onDetailLoaded]);

  useEffect(() => {
    if (!enabled || !accessToken || !teacherId) {
      setDetail(null);
      setSubjects([]);
      setDetailError("");
      setDetailLoading(false);
      return;
    }
    void load();
  }, [enabled, accessToken, teacherId, load]);

  useEffect(() => {
    if (!enabled) {
      setPickerOpen(false);
      setPickerGroup(null);
      setStudentsOpen(false);
      setStudentsCtx(null);
      setReportOpen(false);
      setReportViewModel(null);
      setNestedStudentVm(null);
    }
  }, [enabled]);

  const closeReport = () => {
    reportClassRef.current = null;
    setReportOpen(false);
    setReportClass(null);
    setReportError("");
    setReportViewModel(null);
    setNestedStudentVm(null);
  };

  const openClassReport = async (cls) => {
    if (!accessToken || !cls?.classId) return;
    reportClassRef.current = cls;
    setReportClass(cls);
    setReportOpen(true);
    setReportError("");
    setReportViewModel(null);
    setReportLoading(true);
    setPickerOpen(false);

    const path = `/api/school/classes/${cls.classId}/report-data?windowDays=30`;
    try {
      const result = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path,
      });
      if (result?.status !== 200) {
        setReportError(apiErrorMessageHe(result?.body?.error, "שגיאה בטעינת דוח"));
        return;
      }
      setReportViewModel(
        parseClassReportViewModel(
          result.body,
          { ...cls, classId: cls.classId },
          result.body?.schoolManagerExtras || {}
        )
      );
    } finally {
      setReportLoading(false);
    }
  };

  const openStudentReport = async (studentId, row, ctxClass) => {
    if (!accessToken || !studentId) return;
    const ctx = ctxClass || reportClassRef.current || reportClass;
    const params = new URLSearchParams({ windowDays: "30" });
    if (ctx?.classId) params.set("classId", String(ctx.classId));
    const ctxGrade = row?.gradeLevel || ctx?.gradeLevel;
    const ctxPhysical = row?.physicalClassName || ctx?.name;
    if (ctxGrade) params.set("gradeLevel", String(ctxGrade));
    if (ctxPhysical) params.set("physicalClassName", String(ctxPhysical));
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    setStudentReportLoading(true);
    try {
      const result = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path,
      });
      if (result?.status !== 200) return;
      const body = result.body;
      const displayName =
        row?.displayName ||
        body?.student?.full_name ||
        reportViewModel?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "ילד/ה";
      setNestedStudentVm(
        parseStudentReportViewModel(
          body,
          {
            studentId,
            displayName,
            physicalClassName: ctxPhysical,
            gradeLevel: ctxGrade,
          },
          {
            schoolName,
            subjectFocus: ctx?.subjectFocus,
          }
        )
      );
    } finally {
      setStudentReportLoading(false);
    }
  };

  const openStudentReportFromClass = async (studentId, row) => {
    await openStudentReport(studentId, row, reportClassRef.current || reportClass);
  };

  const openPhysicalClass = (group) => {
    const sorted = sortSubjectClasses(group.subjectClasses);
    if (sorted.length === 1) {
      void openClassReport(sorted[0]);
      return;
    }
    setPickerGroup({ ...group, subjectClasses: sorted });
    setPickerOpen(true);
  };

  const openClassStudents = async (cls) => {
    if (!accessToken || !cls) return;
    setStudentsCtx(cls);
    setStudentsOpen(true);
    setStudents([]);
    setStudentsError("");
    setStudentsLoading(true);
    setPickerOpen(false);

    const q = new URLSearchParams({
      gradeLevel: String(cls.gradeLevel || ""),
      physicalClassName: String(cls.name || ""),
    });
    try {
      const res = await schoolAuthFetch(accessToken, `/api/school/students?${q.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setStudentsError(apiErrorMessageHe(body?.error, "שגיאה בטעינת ילדים"));
        return;
      }
      setStudents(body?.data?.students || []);
    } catch {
      setStudentsError("שגיאה בטעינת ילדים");
    } finally {
      setStudentsLoading(false);
    }
  };

  const grantSubject = async (e) => {
    e.preventDefault();
    if (!accessToken || !teacherId) return;
    setBusy(true);
    try {
      await schoolAuthFetch(accessToken, `/api/school/teachers/${teacherId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subject: newSubject }),
      });
      await load({ force: true });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (subjectId) => {
    if (!accessToken || !teacherId) return;
    await schoolAuthFetch(accessToken, `/api/school/teachers/${teacherId}/subjects/${subjectId}`, {
      method: "DELETE",
    });
    await load();
  };

  const isManager = detail?.role === "school_admin";
  const displayTitle = detail?.displayName || SCHOOL_SUBJECTS_TITLE;

  const detailBlocking = detailLoading && !detail && !detailError;

  const studentsModalTitle = studentsCtx
    ? `${studentsCtx.name} · ${schoolSubjectLabelHe(studentsCtx.subjectFocus)}`
    : "";

  if (!teacherId) {
    return <p className="text-white/60 text-sm text-right">לא נמצא מזהה מורה.</p>;
  }

  if (detailBlocking) {
    return <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING_DATA}</p>;
  }

  return (
    <div
      className="space-y-6"
      data-testid={detail && !detailError ? "school-teacher-page-ready" : undefined}
    >
      {showBackLink ? (
        <Link href="/school/teachers" className="text-amber-300 text-sm hover:underline inline-block">
          {SCHOOL_BACK_TEACHERS}
        </Link>
      ) : null}

      {detailError ? (
        <p className="text-red-300 text-sm text-right" role="alert">
          {detailError}
        </p>
      ) : null}

      <SchoolPageIntro
        title={displayTitle}
        subtitle={isManager ? SCHOOL_ROLE_MANAGER : SCHOOL_ROLE_TEACHER}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <SchoolStatCard label={SCHOOL_COL_CLASSES} value={detail?.activeClassCount ?? 0} accent="sky" />
        <SchoolStatCard
          label={SCHOOL_COL_STUDENTS}
          value={detail?.activeStudentLinkCount ?? 0}
          accent="emerald"
        />
      </div>

      {!isManager ? (
        <SchoolSection title={SCHOOL_TEACHER_CLASSES_TITLE} data-testid="school-teacher-physical-classes">
          {classesLoading ? (
            <p className="text-xs text-white/45 mb-3 text-right">{SCHOOL_LOADING_DATA}</p>
          ) : null}
          {classesError ? (
            <p className="text-red-300 text-sm text-right" role="alert">
              {classesError}
            </p>
          ) : null}
          {!classesLoading && !classesError && physicalGroups.length ? (
            <SchoolCardGrid columns={2}>
              {physicalGroups.map((group) => {
                const key = physicalClassGroupKey(group.subjectClasses[0]);
                const studentCount = physicalClassStudentCount(group.subjectClasses);
                const subjectLabels = physicalClassSubjectLabelsHe(group.subjectClasses);
                return (
                  <SchoolManagementCard
                    key={key}
                    title={group.name}
                    subtitle={`${studentCount} ילדים`}
                    meta={`${SCHOOL_TEACHER_CLASS_SUBJECTS_PREFIX}: ${subjectLabels.join(", ")}`}
                    onClick={() => openPhysicalClass(group)}
                    data-testid={`school-teacher-physical-class-card-${key}`}
                  />
                );
              })}
            </SchoolCardGrid>
          ) : null}
          {!classesLoading && !classesError && !physicalGroups.length ? (
            <SchoolEmptyState title={SCHOOL_TEACHER_EMPTY_CLASSES} />
          ) : null}
        </SchoolSection>
      ) : null}

      {isManager ? (
        <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right`}>
          <p className="text-sm text-white/70">{SCHOOL_MANAGER_ALL_SUBJECTS}</p>
        </div>
      ) : (
        <SchoolSection title={SCHOOL_SUBJECTS_TITLE}>
          <div className="mb-4">
            <p className="text-sm text-white/55 mb-2">מקצועות מורשים:</p>
            <SchoolSubjectBadges subjects={subjects.map((s) => s.subject)} max={12} />
          </div>
          <ul className="space-y-2 mb-6">
            {subjects.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap justify-between items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <span className="font-medium">
                  {schoolSubjectLabelHe(s.subject)}
                  {s.gradeLevel ? ` (${s.gradeLevel})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void revoke(s.id)}
                  className="text-xs text-red-300 hover:underline"
                >
                  {SCHOOL_SUBJECT_REMOVE}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={grantSubject} className="flex flex-wrap gap-3 items-end border-t border-white/10 pt-4">
            <label className="text-sm text-white/70">
              מקצוע
              <SchoolSubjectSelect value={newSubject} onChange={setNewSubject} />
            </label>
            <SchoolPrimaryButton disabled={busy} type="submit">
              {busy ? "…" : SCHOOL_SUBJECT_ADD}
            </SchoolPrimaryButton>
          </form>
        </SchoolSection>
      )}

      <SchoolTeacherPhysicalClassPickerModal
        open={pickerOpen}
        physicalClassName={pickerGroup?.name || ""}
        subjectClasses={pickerGroup?.subjectClasses || []}
        zIndex={pickerZIndex}
        onClose={() => {
          setPickerOpen(false);
          setPickerGroup(null);
        }}
        onClassReport={(cls) => void openClassReport(cls)}
        onClassStudents={(cls) => void openClassStudents(cls)}
      />

      <SchoolTeacherClassStudentsModal
        open={studentsOpen}
        title={studentsModalTitle}
        loading={studentsLoading}
        error={studentsError}
        students={students}
        gradeLevel={studentsCtx?.gradeLevel || ""}
        zIndex={studentsZIndex}
        onClose={() => {
          setStudentsOpen(false);
          setStudentsCtx(null);
          setStudents([]);
          setStudentsError("");
        }}
        onStudentReport={(student) => void openStudentReport(student.studentId, student, studentsCtx)}
      />

      <SchoolReportModal
        open={reportOpen}
        title={SCHOOL_CLASS_REPORT_TITLE}
        onClose={closeReport}
        loading={reportLoading}
        loadingLabel={SCHOOL_REPORT_LOADING}
        error={reportError}
        viewModel={reportViewModel}
        onStudentReport={openStudentReportFromClass}
        studentReportLoading={studentReportLoading}
        nestedStudentViewModel={nestedStudentVm}
        onCloseStudentReport={() => setNestedStudentVm(null)}
        stackZIndexBase={reportStackZIndexBase}
      />
    </div>
  );
}
