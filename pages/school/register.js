import Link from "next/link";
import Layout from "../../components/Layout";
import PortalLoginHeading from "../../components/auth/PortalLoginHeading";
import SchoolRegistrationRequestForm from "../../components/auth/SchoolRegistrationRequestForm";
import { REG_SCHOOL_TITLE } from "../../lib/auth/auth-registration.he.js";

export default function SchoolRegisterPage() {
  return (
    <Layout>
      <div
        className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-8"
        data-testid="school-register-page"
        dir="rtl"
        lang="he"
      >
        <PortalLoginHeading title={REG_SCHOOL_TITLE} className="md:!mb-4" />

        <div className="rounded-2xl border border-white/15 bg-black/40 p-3 md:p-5">
          <SchoolRegistrationRequestForm />
          <p className="mt-2.5 md:mt-4 text-xs text-white/60 leading-snug">
            כבר יש לך חשבון?{" "}
            <Link href="/teacher/login" className="text-amber-300 underline">
              כניסה למורים
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
