import StudentAdSlot from "./StudentAdSlot.jsx";

/**
 * Scroll pages without Layout footer: ad at end of content flow (not fixed).
 */
export default function StudentImmersiveAdPage({
  children,
  theme = "classic",
}) {
  return (
    <>
      {children}
      <StudentAdSlot variant="inline" theme={theme} />
    </>
  );
}
