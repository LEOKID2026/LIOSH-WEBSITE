import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SmartBlocksPlayView from "../SmartBlocksPlayView.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import {
  applyShapePlacement,
  createInitialSmartBlocksState,
} from "../../../lib/solo-games/smart-blocks-logic.js";
import {
  canPlaceShape,
  getDifficultySettings,
  pointerToGridCell,
} from "../../../lib/solo-games/smart-blocks-shapes.js";

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoSmartBlocksEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const boardRef = useRef(null);
  const dragPointerIdRef = useRef(null);

  const scoreRef = useRef(0);
  const movesRef = useRef(0);
  const placedBlocksRef = useRef(0);
  const clearedRowsRef = useRef(0);
  const clearedColumnsRef = useRef(0);
  const clearedLinesTotalRef = useRef(0);
  const combosRef = useRef(0);
  const bestComboRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [board, setBoard] = useState(() => createInitialSmartBlocksState(initialDifficulty).board);
  const [trayShapes, setTrayShapes] = useState(
    () => createInitialSmartBlocksState(initialDifficulty).trayShapes,
  );
  const [score, setScore] = useState(0);
  const [drag, setDrag] = useState(null);

  const settings = getDifficultySettings(difficulty);
  const gridSize = settings.gridSize;
  const scoreTarget = settings.scoreTarget;

  const gameStateRef = useRef(null);
  gameStateRef.current = {
    board,
    trayShapes,
    score,
    moves: movesRef.current,
    placedBlocks: placedBlocksRef.current,
    clearedRows: clearedRowsRef.current,
    clearedColumns: clearedColumnsRef.current,
    clearedLinesTotal: clearedLinesTotalRef.current,
    combos: combosRef.current,
    bestCombo: bestComboRef.current,
  };

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "smart-blocks",
    gameRunning,
    showIntro: false,
    gameOver,
  });

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(() => {
    const wrapper = document.getElementById("game-wrapper");
    if (!wrapper) return undefined;
    const block = (e) => {
      if (e.target?.closest?.("button")) return;
      e.preventDefault();
    };
    wrapper.addEventListener("contextmenu", block);
    return () => wrapper.removeEventListener("contextmenu", block);
  }, []);

  useEffect(() => {
    const preventTouchScroll = (e) => {
      if (e.target.closest("[data-smart-blocks-board]")) e.preventDefault();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  const syncMetricsFromState = (nextState) => {
    scoreRef.current = nextState.score;
    movesRef.current = nextState.moves;
    placedBlocksRef.current = nextState.placedBlocks;
    clearedRowsRef.current = nextState.clearedRows;
    clearedColumnsRef.current = nextState.clearedColumns;
    clearedLinesTotalRef.current = nextState.clearedLinesTotal;
    combosRef.current = nextState.combos;
    bestComboRef.current = nextState.bestCombo;
    setScore(nextState.score);
    setBoard(nextState.board);
    setTrayShapes(nextState.trayShapes);
  };

  const fireSessionEnd = (didWin) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    const durationMs =
      playStartedAtRef.current != null
        ? Math.max(0, Date.now() - playStartedAtRef.current)
        : undefined;
    onSessionEnd({
      score: scoreRef.current,
      didWin,
      difficulty,
      moves: movesRef.current,
      placedBlocks: placedBlocksRef.current,
      clearedRows: clearedRowsRef.current,
      clearedColumns: clearedColumnsRef.current,
      clearedLinesTotal: clearedLinesTotalRef.current,
      combos: combosRef.current,
      bestCombo: bestComboRef.current,
      durationSec: durationMs != null ? Math.round(durationMs / 1000) : undefined,
      durationMs,
      accuracy: 100,
      timeRemainingSec: 0,
    });
  };

  const endGame = (didWin) => {
    if (pendingSessionEndRef.current) return;
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    setDrag(null);
    dragPointerIdRef.current = null;
    pendingSessionEndRef.current = { didWin };
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.didWin);
  };

  const startGame = useCallback(() => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    const initial = createInitialSmartBlocksState(difficulty);
    scoreRef.current = 0;
    movesRef.current = 0;
    placedBlocksRef.current = 0;
    clearedRowsRef.current = 0;
    clearedColumnsRef.current = 0;
    clearedLinesTotalRef.current = 0;
    combosRef.current = 0;
    bestComboRef.current = 0;
    setScore(0);
    setBoard(initial.board);
    setTrayShapes(initial.trayShapes);
    setGameOver(false);
    setWon(false);
    setDrag(null);
    dragPointerIdRef.current = null;
    syncPortraitPromptForRun();
    setGameRunning(true);
  }, [difficulty, syncPortraitPromptForRun]);

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver) startGame();
  }, [autoStart, gameRunning, gameOver, startGame]);

  const ghostPreview = useMemo(() => {
    if (!drag?.hoverCell) return null;
    const valid = canPlaceShape(
      drag.shape,
      drag.hoverCell.row,
      drag.hoverCell.col,
      gridSize,
      board,
    );
    return { ...drag.hoverCell, valid };
  }, [board, drag, gridSize]);

  const finishDrag = useCallback(
    (clientX, clientY) => {
      if (!drag || !gameRunning || gameOver) {
        setDrag(null);
        dragPointerIdRef.current = null;
        return;
      }
      const boardEl = boardRef.current;
      if (!boardEl) {
        setDrag(null);
        dragPointerIdRef.current = null;
        return;
      }
      const cell = pointerToGridCell(boardEl, gridSize, clientX, clientY, drag.shape);
      if (cell) {
        const beforeLines = clearedLinesTotalRef.current;
        const beforeCombos = combosRef.current;
        const result = applyShapePlacement(
          gameStateRef.current,
          difficulty,
          drag.slotIndex,
          drag.shape,
          cell.row,
          cell.col,
        );
        if (result.ok) {
          if (result.state.clearedLinesTotal > beforeLines) sfx.playClearLine();
          if (result.state.combos > beforeCombos) sfx.playCombo();
          syncMetricsFromState(result.state);
          if (result.didWin || result.noMovesLeft) {
            endGame(result.didWin);
          }
        }
      }
      setDrag(null);
      dragPointerIdRef.current = null;
    },
    [difficulty, drag, gameOver, gameRunning, gridSize, sfx],
  );

  useEffect(() => {
    if (!drag) return undefined;

    const onMove = (e) => {
      if (dragPointerIdRef.current != null && e.pointerId !== dragPointerIdRef.current) return;
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const cell = pointerToGridCell(boardEl, gridSize, e.clientX, e.clientY, drag?.shape);
      setDrag((prev) =>
        prev ? { ...prev, hoverCell: cell, clientX: e.clientX, clientY: e.clientY } : prev,
      );
    };

    const onUp = (e) => {
      if (dragPointerIdRef.current != null && e.pointerId !== dragPointerIdRef.current) return;
      finishDrag(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, finishDrag, gridSize]);

  const onTrayPointerDown = (slotIndex, shape, e) => {
    if (!gameRunning || gameOver) return;
    e.preventDefault();
    dragPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    setDrag({
      shape,
      slotIndex,
      hoverCell: null,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  return (
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      {showFullscreenButton ? (
        <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
          <SoloGameMobileFullscreenButton
            isFullscreen={isFullscreen}
            onToggle={toggleFromUserGesture}
          />
        </div>
      ) : null}

      <SmartBlocksPlayView
        gridSize={gridSize}
        board={board}
        trayShapes={trayShapes}
        score={score}
        scoreTarget={scoreTarget}
        drag={drag}
        dragSlotIndex={drag?.slotIndex ?? null}
        ghostPreview={ghostPreview}
        boardRef={boardRef}
        onTrayPointerDown={onTrayPointerDown}
        gameOver={gameOver}
        won={won}
        onCompleteEndInterstitial={completeEndInterstitial}
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
