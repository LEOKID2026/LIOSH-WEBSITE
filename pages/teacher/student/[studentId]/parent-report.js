import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";

export async function getServerSideProps(context) {
  const studentId = String(context.params?.studentId || "").trim();
  if (!studentId) {
    return { notFound: true };
  }
  return { props: { studentId } };
}

export default function TeacherStudentParentReportPage({ studentId }) {
  const router = useRouter();

  useEffect(() => {
    if (!studentId) return;
    router.replace({
      pathname: "/teacher/parent-report",
      query: { studentId, source: "teacher", period: "month" },
    });
  }, [router, studentId]);

  return (
    <Layout>
      <div className="min-h-[40vh] flex items-center justify-center" dir="rtl">
        <p className="text-white/70 text-sm">טוען דוח להורים…</p>
      </div>
    </Layout>
  );
}
