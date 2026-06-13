import StudentAdSlot from "../student/StudentAdSlot.jsx";

/**
 * Reserved ad placement for learning masters (dvh footer band).
 */
export default function LearningMasterAdSlot({ MB }) {
  return (
    <StudentAdSlot
      variant="inline"
      dataAdSlot="learning-master-reserved"
    />
  );
}
