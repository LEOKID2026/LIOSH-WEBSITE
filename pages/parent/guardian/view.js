import ParentTeacherCodeReport from "../../../components/parent/ParentTeacherCodeReport";

export async function getServerSideProps() {
  return { props: {} };
}

export default function ParentGuardianViewPage() {
  return (
    <ParentTeacherCodeReport
      loginRedirectPath="/parent/login"
      logoutRedirectPath="/parent/login"
    />
  );
}
