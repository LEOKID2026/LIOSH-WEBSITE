import StudentAdSlot from "../student/StudentAdSlot.jsx";

/**
 * Reserved bottom ad slot for Solo Games non-gameplay screens.
 * Uses the same StudentAdSlot / dvh pattern as offline arcade pages.
 *
 * @param {{ className?: string, dataAdSlot?: string }} props
 */
export default function SoloGameAdSlot({
  className = "",
  dataAdSlot = "solo-game-ad-reserved",
}) {
  return (
    <StudentAdSlot variant="dvh" className={className} dataAdSlot={dataAdSlot} />
  );
}
