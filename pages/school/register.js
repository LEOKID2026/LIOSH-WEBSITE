import Link from "next/link";
import Layout from "../../components/Layout";
import SchoolRegistrationRequestForm from "../../components/auth/SchoolRegistrationRequestForm";
import { REG_SCHOOL_LINK } from "../../lib/auth/auth-registration.he.js";

export default function SchoolRegisterPage() {
  return (
    <Layout>
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12"
        data-testid="school-register-page"
        dir="rtl"
        lang="he"
      >
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-black/40 p-6 shadow-xl">
          <SchoolRegistrationRequestForm />
          <p className="mt-6 text-sm text-white/50">
            כבר יש לך חשבון?{" "}
            <Link href="/teacher/login" className="text-amber-300 hover:underline">
              כניסה למורים
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
