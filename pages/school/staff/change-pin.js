import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import SchoolStaffChangePinForm from "../../../components/school-portal/SchoolStaffChangePinForm";
import { SCHOOL_STAFF_CHANGE_PIN_TITLE } from "../../../lib/school-portal/school-ui.he";

export default function SchoolStaffChangePinPage() {
  const router = useRouter();

  return (
    <Layout>
      <TeacherPortalShell title={SCHOOL_STAFF_CHANGE_PIN_TITLE}>
        <div data-testid="school-staff-change-pin-root" dir="rtl" lang="he">
          <SchoolStaffChangePinForm
            onSuccess={(redirectPath) => {
              router.replace(redirectPath || "/teacher/dashboard");
            }}
          />
        </div>
      </TeacherPortalShell>
    </Layout>
  );
}
