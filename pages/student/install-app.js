import StudentPwaInstallLauncher from "../../components/student/StudentPwaInstallLauncher";
import PwaInstallPageShell from "../../components/pwa/PwaInstallPageShell";

/** SSR so manifest.json is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function StudentPwaInstallPage() {
  return (
    <PwaInstallPageShell
      portal="student"
      badge="LEO K"
      title="התקנת אפליקציה לילדים"
      pageTitle="LEO K — התקנה"
      launcher={StudentPwaInstallLauncher}
    />
  );
}
