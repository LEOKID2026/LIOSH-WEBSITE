import { useCallback, useEffect, useRef, useState } from "react";
import SoloGameAdSlot from "../SoloGameAdSlot.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameShellUi } from "../../../hooks/solo-games/useSoloGameShellUi.js";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import { exitMobileGameFullscreen } from "../../../lib/solo-games/solo-game-fullscreen.client.js";
import {
  ACTIVE_PICTURE_PUZZLE_MECHANIC,
  PLACEMENT_DIFFICULTY_SETTINGS,
  PREVIEW_NAV_BTN_CLASS,
  PREVIEW_SWIPE_THRESHOLD_PX,
  PUZZLE_IMAGES,
  SLIDING_DIFFICULTY_SETTINGS,
} from "../../../lib/solo-games/picture-puzzle-config.js";
import {
  applyFreeMoveToSlot,
  createPlacementBoard,
  isPlacementComplete,
  returnPieceToTray,
} from "../../../lib/solo-games/picture-puzzle-placement.js";
import MleoPicturePuzzlePlacementPlay from "./MleoPicturePuzzlePlacementPlay.jsx";
import MleoPicturePuzzleSlidingPlay, {
  isSlidingPuzzleSolved,
} from "./MleoPicturePuzzleSlidingPlay.jsx";

export { PUZZLE_IMAGES };

const USE_PLACEMENT = ACTIVE_PICTURE_PUZZLE_MECHANIC === "placement";

function createSolvedTiles(gridSize) {
  const tiles = [];
  for (let i = 0; i < gridSize * gridSize; i += 1) tiles.push(i);
  tiles[tiles.length - 1] = null;
  return tiles;
}

function getAdjacentIndices(index, gridSize) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const out = [];
  if (col > 0) out.push(index - 1);
  if (col < gridSize - 1) out.push(index + 1);
  if (row > 0) out.push(index - gridSize);
  if (row < gridSize - 1) out.push(index + gridSize);
  return out;
}

function shuffleMoveCount(difficulty) {
  if (difficulty === "easy") return 8 + Math.floor(Math.random() * 5);
  if (difficulty === "medium") return 25 + Math.floor(Math.random() * 16);
  return 60 + Math.floor(Math.random() * 31);
}

function legalShuffle(gridSize, shuffleMoves) {
  const solved = createSolvedTiles(gridSize);
  let tiles = [...solved];
  let blankIndex = tiles.indexOf(null);
  const moves = Math.max(1, shuffleMoves);

  for (let i = 0; i < moves; i += 1) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
    blankIndex = pick;
  }

  if (isSlidingPuzzleSolved(tiles, gridSize)) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[0];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
  }

  return tiles;
}

function canMoveTile(tiles, index, gridSize) {
  if (tiles[index] == null) return false;
  const blankIndex = tiles.indexOf(null);
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const blankRow = Math.floor(blankIndex / gridSize);
  const blankCol = blankIndex % gridSize;
  return (
    (row === blankRow && Math.abs(col - blankCol) === 1) ||
    (col === blankCol && Math.abs(row - blankRow) === 1)
  );
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void, onPreGameUiChange?: (active: boolean) => void }} props
 */
export default function MleoPicturePuzzleEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
  onPreGameUiChange,
}) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const movesRef = useRef(0);
  const hintTimerRef = useRef(null);
  const previewTouchStartX = useRef(null);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [selectedImageId, setSelectedImageId] = useState(PUZZLE_IMAGES[0].id);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [showPicker, setShowPicker] = useState(true);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [won, setWon] = useState(false);
  const [showHintPreview, setShowHintPreview] = useState(false);

  const {
    isFullscreen,
    mobileEligible,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "picture-puzzle",
    gameRunning,
    showIntro: showPicker,
    gameOver,
  });

  // sliding state
  const [tiles, setTiles] = useState([]);
  const [blockedMsg, setBlockedMsg] = useState("");

  // placement state
  /** @type {[null | { pieceId: number, source: "tray" | "board", sourceSlotId: number | null }, Function]} */
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [boardSlots, setBoardSlots] = useState([]);
  const [trayPieces, setTrayPieces] = useState([]);

  const { SG, pageBgStyle } = useSoloGameShellUi();

  useEffect(() => {
    onPreGameUiChange?.(showPicker);
    return () => onPreGameUiChange?.(false);
  }, [showPicker, onPreGameUiChange]);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    []
  );

  const slidingSettings = SLIDING_DIFFICULTY_SETTINGS[difficulty] || SLIDING_DIFFICULTY_SETTINGS.medium;
  const placementSettings =
    PLACEMENT_DIFFICULTY_SETTINGS[difficulty] || PLACEMENT_DIFFICULTY_SETTINGS.medium;
  const settings = USE_PLACEMENT ? placementSettings : slidingSettings;
  const gridSize = settings.grid;
  const puzzleImage =
    PUZZLE_IMAGES.find((img) => img.id === selectedImageId)?.src || PUZZLE_IMAGES[0].src;
  const isEasy = difficulty === "easy";

  const safePreviewIndex =
    previewIndex == null
      ? null
      : Math.min(Math.max(previewIndex, 0), PUZZLE_IMAGES.length - 1);
  const previewImage = safePreviewIndex == null ? null : PUZZLE_IMAGES[safePreviewIndex];
  const canPreviewPrev = safePreviewIndex != null && safePreviewIndex > 0;
  const canPreviewNext =
    safePreviewIndex != null && safePreviewIndex < PUZZLE_IMAGES.length - 1;

  const closePreview = () => setPreviewIndex(null);

  const goPreviewPrev = () => {
    setPreviewIndex((index) => (index == null ? index : Math.max(0, index - 1)));
  };

  const goPreviewNext = () => {
    setPreviewIndex((index) =>
      index == null ? index : Math.min(PUZZLE_IMAGES.length - 1, index + 1)
    );
  };

  const handlePreviewTouchStart = (event) => {
    previewTouchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handlePreviewTouchEnd = (event) => {
    if (previewTouchStartX.current == null || PUZZLE_IMAGES.length < 2) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - previewTouchStartX.current;
    previewTouchStartX.current = null;
    if (Math.abs(delta) < PREVIEW_SWIPE_THRESHOLD_PX) return;
    setPreviewIndex((index) => {
      if (index == null) return index;
      if (delta > 0 && index < PUZZLE_IMAGES.length - 1) return index + 1;
      if (delta < 0 && index > 0) return index - 1;
      return index;
    });
  };

  useEffect(() => {
    if (previewIndex == null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewIndex(null);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPreviewIndex((index) =>
          index == null ? index : Math.min(PUZZLE_IMAGES.length - 1, index + 1)
        );
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPreviewIndex((index) => (index == null ? index : Math.max(0, index - 1)));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewIndex]);

  const computeWinScore = (remaining, moveCount) => {
    const extra = Math.max(0, moveCount - settings.parMoves);
    const timeBonus = isEasy ? remaining * 2 : remaining * 3;
    return Math.max(0, 400 + timeBonus - extra * 8);
  };

  const fireSessionEnd = (didWin, remaining, moveCount, finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin,
      difficulty,
      mistakes: Math.max(0, moveCount - settings.parMoves),
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (didWin, remaining) => {
    exitMobileGameFullscreen();
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    const finalScore = didWin ? computeWinScore(remaining, movesRef.current) : 0;
    pendingSessionEndRef.current = {
      didWin,
      remaining,
      moveCount: movesRef.current,
      finalScore,
    };
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.didWin, pending.remaining, pending.moveCount, pending.finalScore);
  };

  const closeHint = () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setShowHintPreview(false);
  };

  const triggerHint = () => {
    if (!gameRunning || gameOver) return;
    sfx.playUiOpen();
    setShowHintPreview(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowHintPreview(false), 3000);
  };

  const countMove = () => {
    movesRef.current += 1;
    setMoves(movesRef.current);
  };

  const checkPlacementWin = (slots) => {
    if (isPlacementComplete(slots)) {
      endGame(true, timeLeft);
    }
  };

  const startGame = (imageId) => {
    if (imageId) setSelectedImageId(imageId);
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    movesRef.current = 0;
    setMoves(0);
    setShowPicker(false);
    setGameOver(false);
    setWon(false);
    setShowHintPreview(false);
    setBlockedMsg("");
    setSelectedPiece(null);
    setTimeLeft(settings.timeSec);

    if (USE_PLACEMENT) {
      const board = createPlacementBoard(gridSize);
      setBoardSlots(board.boardSlots);
      setTrayPieces(board.trayPieces);
      setTiles([]);
    } else {
      setTiles(legalShuffle(gridSize, shuffleMoveCount(difficulty)));
      setBoardSlots([]);
      setTrayPieces([]);
    }

    syncPortraitPromptForRun();
    setGameRunning(true);
  };

  const chooseImageAndStart = (imageId) => {
    closePreview();
    startGame(imageId);
  };

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      const incomplete = USE_PLACEMENT
        ? !isPlacementComplete(boardSlots)
        : !isSlidingPuzzleSolved(tiles, gridSize);
      if (incomplete) endGame(false, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft, boardSlots, tiles]);

  const tryMove = (index) => {
    if (!gameRunning || gameOver) return;
    if (tiles[index] == null) return;

    if (!canMoveTile(tiles, index, gridSize)) {
      sfx.playWarning();
      setBlockedMsg("אי אפשר להזיז את האריח הזה");
      window.setTimeout(() => setBlockedMsg(""), 1200);
      return;
    }

    const blank = tiles.indexOf(null);
    const next = [...tiles];
    [next[index], next[blank]] = [next[blank], next[index]];
    movesRef.current += 1;
    setMoves(movesRef.current);
    sfx.playDropOk();
    setTiles(next);

    if (isSlidingPuzzleSolved(next, gridSize)) {
      endGame(true, timeLeft);
    }
  };

  const handleSelectTrayPiece = (pieceId) => {
    if (!gameRunning || gameOver) return;

    if (selectedPiece?.source === "board") {
      handleReturnToTray();
      return;
    }

    setSelectedPiece((prev) =>
      prev?.source === "tray" && prev.pieceId === pieceId
        ? null
        : { pieceId, source: "tray", sourceSlotId: null }
    );
    if (!(selectedPiece?.source === "tray" && selectedPiece.pieceId === pieceId)) {
      sfx.playDrag();
    }
  };

  const handleReturnToTray = () => {
    if (!gameRunning || gameOver) return;
    if (selectedPiece?.source !== "board" || selectedPiece.sourceSlotId == null) return;

    const returned = returnPieceToTray(
      boardSlots,
      trayPieces,
      selectedPiece.sourceSlotId
    );
    if (!returned.changed) return;

    countMove();
    setBoardSlots(returned.boardSlots);
    setTrayPieces(returned.trayPieces);
    setSelectedPiece(null);
  };

  const handleSelectBoardSlot = (slotId) => {
    if (!gameRunning || gameOver) return;

    const slot = boardSlots.find((s) => s.slotId === slotId);
    if (!slot) return;

    if (selectedPiece) {
      const { pieceId, source, sourceSlotId } = selectedPiece;
      if (source === "board" && sourceSlotId === slotId) {
        setSelectedPiece(null);
        return;
      }

      const result = applyFreeMoveToSlot(
        boardSlots,
        trayPieces,
        slotId,
        pieceId,
        source === "board" ? sourceSlotId : null
      );
      if (!result.changed) return;

      countMove();
      sfx.playDropOk();
      setBoardSlots(result.boardSlots);
      setTrayPieces(result.trayPieces);
      setSelectedPiece(null);
      checkPlacementWin(result.boardSlots);
      return;
    }

    if (slot.placedPieceId != null) {
      sfx.playDrag();
      setSelectedPiece({
        pieceId: slot.placedPieceId,
        source: "board",
        sourceSlotId: slotId,
      });
    }
  };

  useEffect(() => {
    if (showPicker) return undefined;
    return () => {
      exitMobileGameFullscreen();
    };
  }, [showPicker]);

  const playWrap =
    "relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell";

  return (
    <div
      id="game-wrapper"
      className={showPicker ? SG.preGameWrap : playWrap}
      style={showPicker ? pageBgStyle : undefined}
      dir="rtl"
    >
      {showPicker ? (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-1 py-0.5 sm:px-2 sm:py-1">
          <div className="shrink-0 py-0.5 text-center leading-tight">
            <h2 className={SG.preGameTitle}>בחרו תמונה לפאזל</h2>
            <p className={SG.preGameSub}>לחצו על תמונה ובחרו</p>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
            <div className="grid w-full max-w-[min(calc(100vw-12px),328px)] grid-cols-4 grid-rows-5 gap-1 sm:max-w-[min(560px,90vw)] sm:grid-cols-5 sm:grid-rows-4 sm:gap-2">
              {PUZZLE_IMAGES.map((img, index) => {
                const selected = selectedImageId === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className={`relative aspect-square w-full min-w-0 overflow-hidden rounded-md border-2 p-0 transition sm:rounded-lg ${
                      selected ? SG.preGameImageBorderSelected : SG.preGameImageBorderDefault
                    }`}
                    style={{ touchAction: "manipulation" }}
                    aria-label={`${img.label}${selected ? " - נבחרה" : ""}`}
                  >
                    <img
                      src={img.src}
                      alt=""
                      className="block h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 px-1 pb-1 pt-1 sm:px-2">
            <SoloGameAdSlot />
          </div>

          {previewImage ? (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-3"
              role="dialog"
              aria-modal="true"
              aria-label={`תצוגת ${previewImage.label}`}
              onClick={closePreview}
            >
              <div
                className="flex w-full max-w-2xl flex-col items-center gap-3 sm:max-w-3xl"
                onClick={(event) => event.stopPropagation()}
                dir="rtl"
              >
                <div className="flex w-full items-center justify-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={goPreviewPrev}
                    disabled={!canPreviewPrev}
                    className={PREVIEW_NAV_BTN_CLASS}
                    aria-label="תמונה קודמת"
                  >
                    ‹
                  </button>

                  <div
                    className="flex min-w-0 flex-1 touch-pan-y flex-col items-center gap-2"
                    onTouchStart={handlePreviewTouchStart}
                    onTouchEnd={handlePreviewTouchEnd}
                  >
                    <img
                      src={previewImage.src}
                      alt={previewImage.label}
                      className="max-h-[min(72dvh,480px)] w-full max-w-[min(92vw,480px)] rounded-xl object-contain ring-2 ring-yellow-400"
                      draggable={false}
                    />
                    <p className="text-sm font-bold text-yellow-100">{previewImage.label}</p>
                  </div>

                  <button
                    type="button"
                    onClick={goPreviewNext}
                    disabled={!canPreviewNext}
                    className={PREVIEW_NAV_BTN_CLASS}
                    aria-label="תמונה הבאה"
                  >
                    ›
                  </button>
                </div>

                <div className="flex w-full max-w-xs gap-2">
                  <button
                    type="button"
                    onClick={() => chooseImageAndStart(previewImage.id)}
                    className="min-h-[44px] flex-1 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-black"
                    style={{ touchAction: "manipulation" }}
                  >
                    בחר תמונה
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="min-h-[44px] flex-1 rounded-xl border-2 border-white/40 bg-black/50 px-3 py-2 text-sm font-bold text-white"
                    style={{ touchAction: "manipulation" }}
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : USE_PLACEMENT ? (
        <MleoPicturePuzzlePlacementPlay
          puzzleImage={puzzleImage}
          gridSize={gridSize}
          settings={placementSettings}
          gameRunning={gameRunning}
          gameOver={gameOver}
          won={won}
          timeLeft={timeLeft}
          moves={moves}
          boardSlots={boardSlots}
          trayPieces={trayPieces}
          selectedPiece={selectedPiece}
          showHintPreview={showHintPreview}
          onSelectTrayPiece={handleSelectTrayPiece}
          onSelectBoardSlot={handleSelectBoardSlot}
          onReturnToTray={handleReturnToTray}
          onTriggerHint={triggerHint}
          onCloseHint={closeHint}
          isFullscreen={isFullscreen}
          showFullscreenButton={showFullscreenButton}
          toggleFromUserGesture={toggleFromUserGesture}
          computeWinScore={computeWinScore}
        />
      ) : (
        <MleoPicturePuzzleSlidingPlay
          puzzleImage={puzzleImage}
          gridSize={gridSize}
          settings={slidingSettings}
          isEasy={isEasy}
          gameRunning={gameRunning}
          gameOver={gameOver}
          won={won}
          timeLeft={timeLeft}
          moves={moves}
          tiles={tiles}
          blockedMsg={blockedMsg}
          showHintPreview={showHintPreview}
          onTryMove={tryMove}
          onTriggerHint={triggerHint}
          computeWinScore={computeWinScore}
        />
      )}
      {gameOver && !showPicker ? (
        <SoloGameEndInterstitialOverlay
          didWin={won}
          onDone={completeEndInterstitial}
        />
      ) : null}
      <SoloGamePortraitRecommendationModal
        show={showPortraitPrompt}
        subtitle="הלוח והמגש יוצגו בצורה נוחה יותר."
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
