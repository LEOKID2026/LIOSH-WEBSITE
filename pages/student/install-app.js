import StudentPwaInstallLauncher from "../../components/student/StudentPwaInstallLauncher";
import PwaInstallPageShell from "../../components/pwa/PwaInstallPageShell";

/** SSR so manifest-student is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function StudentPwaInstallPage() {
  return (
    <PwaInstallPageShell
      portal="student"
      badge="LEO KIDS"
      title="התקנת אפליקציה לילדים"
      pageTitle="LEO KIDS - התקנה"
      appleTouchIcon="/icons/child/apple-touch-icon.png"
      launcher={StudentPwaInstallLauncher}
    />
  );
}
