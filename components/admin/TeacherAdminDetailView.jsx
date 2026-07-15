import { useMemo, useState } from "react";
import Link from "next/link";
import AdminSectionCard, { AdminFieldRow, AdminStatTile } from "./AdminSectionCard.jsx";
import AdminUserLifecyclePanel from "./AdminUserLifecyclePanel.jsx";
import TeacherQuotaForm from "./TeacherQuotaForm.jsx";
import TeacherDiscussionSubjectsSection from "./TeacherDiscussionSubjectsSection.jsx";
import { isSmokeClassName } from "../../lib/teacher-portal/teacher-smoke-artifacts.js";
import {
  ADMIN_BACK_TO_TEACHERS,
  ADMIN_CLASS_COL_STUDENTS,
  ADMIN_LABEL_CLASSES,
  ADMIN_LABEL_CLASS_STUDENTS,
  ADMIN_LABEL_CREATED,
  ADMIN_LABEL_DIRECT_STUDENTS,
  ADMIN_LABEL_INDIV_ACTIVITIES,
  ADMIN_LABEL_PLAN,
  ADMIN_LABEL_TOTAL_STUDENTS,
  ADMIN_NO_AUDIT,
  ADMIN_NO_CLASSES,
  ADMIN_SECTION_AUDIT,
  ADMIN_SECTION_CLASSES,
  ADMIN_SECTION_IDENTITY,
  ADMIN_SECTION_MANAGEMENT,
  ADMIN_SECTION_USAGE,
  ADMIN_SMOKE_CLASSES_TOGGLE,
  ADMIN_TEACHER_DETAIL_NAV,
  ADMIN_TEACHER_NO_SCHOOL,
  ADMIN_TEACHER_SCHOOL_SECTION,
  ADMIN_TEACHER_SCHOOL_STAFF_READONLY,
  ADMIN_TEACHER_VIEW_SCHOOL,
  ADMIN_SCHOOL_ROLE_MANAGER,
  ADMIN_SCHOOL_ROLE_TEACHER,
  ADMIN_REG_REQUEST_SECTION,
  ADMIN_REG_REQUEST_DETAILS,
  ADMIN_REG_REQUEST_SUBJECTS,
  ADMIN_REG_REQUEST_STATUS,
  ADMIN_REG_REQUEST_SUBMITTED,
  ADMIN_REG_REQUEST_NO_SUBJECTS,
  auditActionLabelHe,
  adminAccountStatusHe,
  adminFormatDateHe,
  adminGradeLabelHe,
  planCodeLabelHe,
  entitlementStatusLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";
import {
  SUBJECT_LABELS_HE,
  regRequestIntentLabelHe as regIntentLabelHe,
  ADMIN_REG_REQUEST_INTENT,
  ADMIN_REG_REQUEST_PHONE,
} from "../../lib/auth/auth-registration.he.js";
import AdminPasswordSetupPanel from "./AdminPasswordSetupPanel.jsx";

function StatusBadge({ teacher }) {
  const active = teacher?.isAccountActive !== false && teacher?.isActive;
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
        active
          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
          : "bg-white/10 text-white/50 border border-white/15"
      }`}
    >
      {adminAccountStatusHe(teacher)}
    </span>
  );
}

export function TeacherAdminDetailHeader({ teacher }) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <Link href="/admin/teachers" className="inline-block text-amber-300 text-sm hover:underline">
        {ADMIN_BACK_TO_TEACHERS}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-right break-words">
            {teacher.displayName || teacher.email || "-"}
          </h1>
        </div>
        <StatusBadge teacher={teacher} />
      </div>
    </div>
  );
}

function SectionNav() {
  const links = [
    { href: "#admin-teacher-summary", label: ADMIN_SECTION_USAGE },
    { href: "#admin-teacher-identity", label: ADMIN_SECTION_IDENTITY },
    { href: "#admin-teacher-quotas", label: ADMIN_SECTION_MANAGEMENT },
    { href: "#admin-teacher-classes", label: ADMIN_SECTION_CLASSES },
    { href: "#admin-teacher-audit", label: ADMIN_SECTION_AUDIT },
  ];

  return (
    <nav
      className="hidden lg:flex flex-wrap gap-x-5 gap-y-2 text-sm border-b border-white/10 pb-3"
      aria-label={ADMIN_TEACHER_DETAIL_NAV}
    >
      {links.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="text-white/60 hover:text-amber-300 transition-colors"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function UsageSummaryGrid({ teacher }) {
  return (
    <AdminSectionCard id="admin-teacher-summary" title={ADMIN_SECTION_USAGE}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AdminStatTile label={ADMIN_LABEL_CLASSES} value={teacher.classCount ?? 0} />
        <AdminStatTile label={ADMIN_LABEL_TOTAL_STUDENTS} value={teacher.totalActiveStudents ?? 0} />
        <AdminStatTile label={ADMIN_LABEL_CLASS_STUDENTS} value={teacher.classStudentCount ?? 0} />
        <AdminStatTile label={ADMIN_LABEL_DIRECT_STUDENTS} value={teacher.directStudentCount ?? 0} />
        <div className="col-span-2 sm:col-span-1">
          <AdminStatTile
            label={ADMIN_LABEL_INDIV_ACTIVITIES}
            value={teacher.individualActivityCount ?? 0}
          />
        </div>
      </div>
    </AdminSectionCard>
  );
}

function TeacherRegSubmissionSection({ teacher, accessToken, onChanged }) {
  const req = teacher.registrationRequest;
  if (!req) return null;

  const subjectLabels = (req.requestedSubjects || [])
    .map((key) => SUBJECT_LABELS_HE[key] || null)
    .filter(Boolean);

  const intentLabel = req.requestIntent ? regIntentLabelHe(req.requestIntent) : null;

  return (
    <>
      <AdminSectionCard
        id="admin-teacher-registration-request"
        title={ADMIN_REG_REQUEST_SECTION}
        className="mt-5 border-amber-400/20 bg-amber-500/5"
      >
        <div className="space-y-3 text-sm">
          <AdminFieldRow
            label={ADMIN_REG_REQUEST_STATUS}
            value={entitlementStatusLabelHe(req.status)}
          />
          <AdminFieldRow
            label={ADMIN_REG_REQUEST_SUBMITTED}
            value={adminFormatDateHe(req.createdAt)}
          />
          {req.phone ? <AdminFieldRow label={ADMIN_REG_REQUEST_PHONE} value={req.phone} /> : null}
          {intentLabel ? (
            <AdminFieldRow label={ADMIN_REG_REQUEST_INTENT} value={intentLabel} />
          ) : null}
          <div>
            <p className="text-white/50 text-xs mb-1">{ADMIN_REG_REQUEST_DETAILS}</p>
            <p className="text-white/85 whitespace-pre-wrap break-words leading-relaxed">
              {req.description || "-"}
            </p>
          </div>
          <div>
            <p className="text-white/50 text-xs mb-1">{ADMIN_REG_REQUEST_SUBJECTS}</p>
            <p className="text-white/85">
              {subjectLabels.length ? subjectLabels.join(" · ") : ADMIN_REG_REQUEST_NO_SUBJECTS}
            </p>
          </div>
        </div>
      </AdminSectionCard>
      <AdminPasswordSetupPanel
        accessToken={accessToken}
        userId={teacher.teacherId}
        passwordSetupSentAt={req.passwordSetupSentAt}
        passwordSetupLastError={req.passwordSetupLastError}
        onChanged={onChanged}
      />
    </>
  );
}

function SchoolMembershipSection({ teacher }) {
  const sm = teacher.schoolMembership;
  return (
    <AdminSectionCard
      id="admin-teacher-school"
      title={ADMIN_TEACHER_SCHOOL_SECTION}
      className="mt-5"
    >
      {!sm?.schoolId ? (
        <p className="text-white/60 text-sm">{ADMIN_TEACHER_NO_SCHOOL}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-white/50">בית ספר: </span>
            <span className="font-medium">{sm.schoolName || sm.schoolId}</span>
          </p>
          <p>
            <span className="text-white/50">תפקיד: </span>
            {sm.schoolRole === "school_admin" ? ADMIN_SCHOOL_ROLE_MANAGER : ADMIN_SCHOOL_ROLE_TEACHER}
          </p>
          <Link
            href={`/admin/schools/${sm.schoolId}`}
            className="inline-block text-amber-300 hover:underline"
          >
            {ADMIN_TEACHER_VIEW_SCHOOL}
          </Link>
        </div>
      )}
    </AdminSectionCard>
  );
}

function IdentitySection({ teacher }) {
  return (
    <AdminSectionCard id="admin-teacher-identity" title={ADMIN_SECTION_IDENTITY}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
        <AdminFieldRow label={ADMIN_LABEL_PLAN} value={planCodeLabelHe(teacher.planCode)} />
        <AdminFieldRow label={ADMIN_LABEL_CREATED} value={adminFormatDateHe(teacher.createdAt)} />
      </div>
    </AdminSectionCard>
  );
}

function ClassRowCard({ classItem: c }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-right">
      <p className="font-medium text-sm break-words">{c.name}</p>
      {c.gradeLevel ? (
        <p className="text-xs text-white/45 mt-0.5">{adminGradeLabelHe(c.gradeLevel)}</p>
      ) : null}
      <p className="text-sm text-white/70 mt-2">
        {ADMIN_CLASS_COL_STUDENTS}:{" "}
        <span className="font-semibold tabular-nums">{c.activeStudentCount ?? 0}</span>
      </p>
    </div>
  );
}

function ClassesSection({ visibleClasses, hiddenSmokeClasses }) {
  const [showSmoke, setShowSmoke] = useState(false);

  return (
    <AdminSectionCard id="admin-teacher-classes" title={ADMIN_SECTION_CLASSES}>
      {visibleClasses.length === 0 && hiddenSmokeClasses.length === 0 ? (
        <p className="text-white/60 text-sm">{ADMIN_NO_CLASSES}</p>
      ) : (
        <>
          {visibleClasses.length === 0 ? (
            <p className="text-white/60 text-sm mb-3">{ADMIN_NO_CLASSES}</p>
          ) : (
            <>
              <div className="md:hidden space-y-2">
                {visibleClasses.map((c) => (
                  <ClassRowCard key={c.classId} classItem={c} />
                ))}
              </div>
              <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleClasses.map((c) => (
                  <ClassRowCard key={c.classId} classItem={c} />
                ))}
              </div>
            </>
          )}

          {hiddenSmokeClasses.length > 0 ? (
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowSmoke((v) => !v)}
                className="text-xs text-white/45 hover:text-white/70 underline underline-offset-2"
              >
                {ADMIN_SMOKE_CLASSES_TOGGLE(hiddenSmokeClasses.length, showSmoke)}
              </button>
              {showSmoke ? (
                <div className="mt-3 space-y-2 opacity-60">
                  {hiddenSmokeClasses.map((c) => (
                    <ClassRowCard key={c.classId} classItem={c} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </AdminSectionCard>
  );
}

function AuditSection({ audit }) {
  return (
    <AdminSectionCard
      id="admin-teacher-audit"
      title={ADMIN_SECTION_AUDIT}
      className="border-white/10 bg-black/20"
    >
      {audit.length === 0 ? (
        <p className="text-white/50 text-sm">{ADMIN_NO_AUDIT}</p>
      ) : (
        <ul className="text-xs space-y-2 max-h-48 overflow-y-auto text-white/70">
          {audit.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2 last:border-0"
            >
              <span className="text-amber-200/80 font-medium">{auditActionLabelHe(e.action)}</span>
              <span className="text-white/40 tabular-nums">{adminFormatDateHe(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminSectionCard>
  );
}

export default function TeacherAdminDetailView({ teacher, audit, accessToken, onUpdated, onReload }) {
  const isPrivateTeacher = !teacher?.schoolMembership?.schoolId;
  const { visibleClasses, hiddenSmokeClasses } = useMemo(() => {
    const visible = [];
    const hidden = [];
    for (const c of teacher.classes || []) {
      if (isSmokeClassName(c.name)) hidden.push(c);
      else visible.push(c);
    }
    return { visibleClasses: visible, hiddenSmokeClasses: hidden };
  }, [teacher.classes]);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <SectionNav />

      {isPrivateTeacher && accessToken ? (
        <AdminUserLifecyclePanel
          accessToken={accessToken}
          userId={teacher.teacherId}
          persona="private_teacher"
          targetEmail={teacher.email}
          onChanged={() => {
            onUpdated?.(teacher);
            onReload?.();
          }}
          onDeleted={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/admin/teachers";
            }
          }}
        />
      ) : null}

      <div className="order-1 lg:order-2">
        <IdentitySection teacher={teacher} />
        <TeacherRegSubmissionSection
          teacher={teacher}
          accessToken={accessToken}
          onChanged={() => {
            onUpdated?.(teacher);
            onReload?.();
          }}
        />
        <SchoolMembershipSection teacher={teacher} />
      </div>

      <div className="order-2 lg:order-1">
        <UsageSummaryGrid teacher={teacher} />
      </div>

      <div id="admin-teacher-quotas" className="order-3">
        {isPrivateTeacher ? (
          <>
            <TeacherQuotaForm
              teacher={teacher}
              accessToken={accessToken}
              onUpdated={(updated) => {
                onUpdated?.(updated);
                onReload?.();
              }}
            />
            <TeacherDiscussionSubjectsSection teacher={teacher} accessToken={accessToken} />
          </>
        ) : (
          <AdminSectionCard id="admin-teacher-quotas" title={ADMIN_SECTION_MANAGEMENT}>
            <p className="text-white/70 text-sm mb-3">{ADMIN_TEACHER_SCHOOL_STAFF_READONLY}</p>
            <Link
              href={`/admin/schools/${teacher.schoolMembership.schoolId}`}
              className="inline-block text-amber-300 hover:underline text-sm"
            >
              {ADMIN_TEACHER_VIEW_SCHOOL}
            </Link>
          </AdminSectionCard>
        )}
      </div>

      <div className="order-4">
        <ClassesSection
          visibleClasses={visibleClasses}
          hiddenSmokeClasses={hiddenSmokeClasses}
        />
      </div>

      <div className="order-5">
        <AuditSection audit={audit} />
      </div>
    </div>
  );
}
