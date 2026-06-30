import { useEffect, useRef } from "react";
import SoloGamePortraitRecommendationModal from "../../solo-games/SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import LeoPizzeriaGame from "../leo-pizzeria/LeoPizzeriaGame.jsx";

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoLeoPizzeriaEngine({
  autoStart = false,
  initialDifficulty = "easy",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
    mobileEligible,
  } = useSoloGameMobileFullscreen({
    gameKey: "leo-pizzeria",
    gameRunning: true,
    showIntro: false,
    gameOver: false,
  });

  useEffect(() => {
    if (!autoStart) return;
    syncPortraitPromptForRun();
  }, [autoStart, syncPortraitPromptForRun]);

  useEffect(() => {
    if (!autoStart || !mobileEligible || showPortraitPrompt) return;
    enterFromUserGesture();
  }, [autoStart, mobileEligible, showPortraitPrompt, enterFromUserGesture]);

  const handleSessionEnd = (metrics) => {
    if (sessionEndFiredRef.current || !onSessionEndRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEndRef.current(metrics);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <LeoPizzeriaGame
        autoStart={autoStart}
        initialDifficulty={initialDifficulty}
        productionMode
        onSessionEnd={handleSessionEnd}
        backHref="/student/educational-games"
        showFullscreenButton={showFullscreenButton}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFromUserGesture}
      />
      <SoloGamePortraitRecommendationModal
        show={showPortraitPrompt}
        onDismissRotate={() => {
          dismissPortraitPrompt(false);
          enterFromUserGesture();
        }}
        onContinueAnyway={() => {
          dismissPortraitPrompt(true);
          enterFromUserGesture();
        }}
      />
    </div>
  );
}
