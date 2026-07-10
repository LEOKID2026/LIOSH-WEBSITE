import Layout from "../Layout";

/**
 * Themed shell after StudentAccessGate — avoids a second full-page loader during session hydrate.
 * @param {{ shellClass: string, shellBgStyle?: object }} props
 */
export default function SubjectMasterSessionShell({ shellClass, shellBgStyle }) {
  return (
    <Layout>
      <div className={shellClass} style={shellBgStyle} dir="rtl" aria-busy="true" />
    </Layout>
  );
}
