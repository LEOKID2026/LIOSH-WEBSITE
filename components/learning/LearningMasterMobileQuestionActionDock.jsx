/**
 * Mobile-only bottom question action row (RTL: book right, secondary left, optional center).
 * Desktop float buttons stay separate with max-md:hidden.
 */
export default function LearningMasterMobileQuestionActionDock({
  MB,
  show = false,
  testId = "learning-question-mobile-actions",
  secondaryWide = false,
  bookSlot = null,
  centerSlot = null,
  secondarySlot = null,
}) {
  if (!show) return null;

  const dockClass = secondaryWide
    ? MB.questionMobileActionDockWideSecondary
    : MB.questionMobileActionDock;

  const emptySide = <span className="block h-8 w-full" aria-hidden="true" />;

  return (
    <div className={dockClass} data-testid={testId}>
      <div className="pointer-events-auto justify-self-stretch min-w-0 flex flex-col items-stretch gap-1.5">
        {bookSlot ?? emptySide}
      </div>
      <div className="pointer-events-auto justify-self-center min-w-0 flex justify-center">
        {centerSlot}
      </div>
      <div
        className={`pointer-events-auto justify-self-stretch min-w-0 ${
          secondaryWide ? "flex items-center justify-end" : ""
        }`}
      >
        {secondarySlot ?? emptySide}
      </div>
    </div>
  );
}
