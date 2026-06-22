import TeacherPwaInstallLauncher from "../../components/teacher/TeacherPwaInstallLauncher";
import PwaInstallPageShell from "../../components/pwa/PwaInstallPageShell";

/** SSR so manifest-teacher is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function TeacherPwaInstallPage() {
  return (
    <PwaInstallPageShell
      portal="teacher"
      badge="T LEO K"
      title="התקנת אפליקציה למורים"
      pageTitle="T LEO K — התקנה"
      appleTitle="T LEO K"
      appleTouchIcon="/images/teacher-icons/icon-192.png"
      launcher={TeacherPwaInstallLauncher}
    />
  );
}
