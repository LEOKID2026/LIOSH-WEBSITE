import ParentTeacherCodeReport from "../../components/parent/ParentTeacherCodeReport";

export async function getServerSideProps() {
  return { props: {} };
}

export default function GuardianViewPage() {
  return (
    <ParentTeacherCodeReport
      loginRedirectPath="/parent/login"
      logoutRedirectPath="/parent/login"
    />
  );
}
