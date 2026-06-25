import { useEffect, useRef } from "react";
import SoloGamePortraitRecommendationModal from "../../solo-games/SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import RecyclingFactoryGame from "../recycling-factory/RecyclingFactoryGame.jsx";
import { buildRecyclingFactoryMetrics } from "../recycling-factory/recycling-factory-metrics.js";

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoRecyclingFactoryEngine({
  autoStart = false,
  initialDifficulty = "medium",
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
    gameKey: "recycling-factory",
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

  const handleSessionEnd = (partial) => {
    if (sessionEndFiredRef.current || !onSessionEndRef.current) return;
    sessionEndFiredRef.current = true;
    const metrics = buildRecyclingFactoryMetrics({
      ...partial,
      gameKey: "recycling-factory",
      category: "educational",
    });
    onSessionEndRef.current(metrics);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <RecyclingFactoryGame
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
