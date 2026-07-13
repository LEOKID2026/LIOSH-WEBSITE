import { useState, useMemo, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import MaybeGameAccessGuard from "../../components/offline/MaybeGameAccessGuard.jsx";
import StudentAdSlot from "../../components/student/StudentAdSlot.jsx";
import GameAudioSettingsButton from "../../components/game-audio/GameAudioSettingsButton.jsx";
import { useRouter } from "next/router";
import OfflineGameHoldShell from "../../components/offline/OfflineGameHoldShell.jsx";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useGameAudio } from "../../hooks/useGameAudio";

const SIZES = [3, 5, 7];

const initialScore = { X: 0, O: 0, ties: 0 };

function playerLabel(symbol) {
  if (symbol === "X") return "איקס";
  if (symbol === "O") return "עיגול";
  return symbol;
}

function cellDisplay(symbol) {
  if (symbol === "X") return "✕";
  if (symbol === "O") return "○";
  return symbol;
}

function makeBoard(size) {
  return Array(size * size).fill(null);
}

function checkWinner(board, size) {
  const lines = [];

  // Rows and columns
  for (let i = 0; i < size; i++) {
    lines.push(board.slice(i * size, i * size + size));
    const col = [];
    for (let j = 0; j < size; j++) {
      col.push(board[j * size + i]);
    }
    lines.push(col);
  }

  // Diagonals
  const diag1 = [];
  const diag2 = [];
  for (let i = 0; i < size; i++) {
    diag1.push(board[i * size + i]);
    diag2.push(board[i * size + (size - 1 - i)]);
  }
  lines.push(diag1, diag2);

  for (const line of lines) {
    if (line.every((cell) => cell && cell === line[0])) {
      return line[0];
    }
  }

  return null;
}

export default function TicTacToeXL() {
  useIOSViewportFix();
  const router = useRouter();
  const { playSfx, primeFromUserGesture } = useGameAudio();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const boardRef = useRef(null);
  const controlsRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState(3);
  const [board, setBoard] = useState(() => makeBoard(3));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [score, setScore] = useState(initialScore);
  const [vsBot, setVsBot] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState("");

  const winner = useMemo(() => checkWinner(board, size), [board, size]);
  const isBoardFull = board.every(Boolean);
  const isMidGame = board.some(Boolean) && !winner && !isBoardFull;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic layout calculation - stable, no state dependencies
  useEffect(() => {
    if (!wrapRef.current || !mounted) return;
    const calc = () => {
      const rootH = window.visualViewport?.height ?? window.innerHeight;
      const headH = headerRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty("--head-h", headH + "px");
      
      // Measure all elements accurately for maximum board size
      const controlsH = controlsRef.current?.offsetHeight || 50;
      const titleH = 70; // Title + subtitle height
      const spacing = 12; // Reduced spacing for more board space
      const safeBottom = typeof window !== "undefined" 
        ? Math.max(parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0"), 20)
        : 20;
      
      // Calculate used space - minimize padding to maximize board
      const used =
        headH +
        titleH +
        controlsH +
        spacing * 2 + // Minimal spacing
        safeBottom;
      
      // Maximize board height - use all available space, minimum 250px
      const freeH = Math.max(250, rootH - used);
      document.documentElement.style.setProperty("--board-h", freeH + "px");
    };
    // Calculate after a small delay to ensure DOM is ready
    const timer = setTimeout(calc, 100);
    window.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, [mounted]); // Only depend on mounted

  useEffect(() => {
    setBoard(makeBoard(size));
    setCurrentPlayer("X");
    setWinnerMessage("");
  }, [size]);

  useEffect(() => {
    if (!vsBot || currentPlayer !== "O" || winner || isBoardFull) return;
    const available = board
      .map((cell, idx) => (cell ? null : idx))
      .filter((idx) => idx !== null);
    if (available.length === 0) return;
    const timeout = setTimeout(() => {
      const pick = available[Math.floor(Math.random() * available.length)];
      handleMove(pick, true);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot, currentPlayer, winner, board, isBoardFull]);

  function handleMove(idx, isBot = false) {
    if (winner || board[idx]) return;
    if (!isBot && vsBot && currentPlayer === "O") return;

    primeFromUserGesture();
    playSfx("sfx-place");

    const nextBoard = [...board];
    nextBoard[idx] = currentPlayer;
    const nextPlayer = currentPlayer === "X" ? "O" : "X";

    const potentialWinner = checkWinner(nextBoard, size);
    const full = nextBoard.every(Boolean);

    setBoard(nextBoard);

    if (potentialWinner) {
      setWinnerMessage(`${playerLabel(potentialWinner)} ניצח!`);
      if (vsBot && potentialWinner === "O") {
        playSfx("sfx-defeat");
      } else {
        playSfx("sfx-victory");
      }
      setScore((prev) => ({
        ...prev,
        [potentialWinner]: prev[potentialWinner] + 1,
      }));
    } else if (full) {
      setWinnerMessage("תיקו!");
      setScore((prev) => ({ ...prev, ties: prev.ties + 1 }));
    } else {
      setCurrentPlayer(nextPlayer);
    }
  }

  function resetBoard() {
    setBoard(makeBoard(size));
    setCurrentPlayer("X");
    setWinnerMessage("");
  }

  function resetScore() {
    setScore(initialScore);
    resetBoard();
  }

  const backSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.push(
        window.location.pathname.startsWith("/student/") ? "/student/offline" : "/offline"
      );
    }
  };

  if (!mounted) return <OfflineGameHoldShell />;

  return (
    <MaybeGameAccessGuard gameKey="tic-tac-toe">
    <Layout>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden bg-gradient-to-b from-[#05070f] via-[#0e111b] to-[#020308] game-page-mobile flex flex-col"
        style={{ height: "100vh", height: "100dvh" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div
          ref={headerRef}
          className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div
            className="relative px-2 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
          >
            <div className="absolute left-2 top-2 flex gap-2 pointer-events-auto items-center">
              <button
                onClick={backSafe}
                className="min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10"
              >
                חזרה
              </button>
              {!isMidGame ? <GameAudioSettingsButton /> : null}
            </div>
            <div className="absolute right-2 top-2 pointer-events-auto">
              <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                מקומי
              </span>
            </div>
          </div>
        </div>

        <div
          className="relative flex flex-col flex-1 min-h-0 items-center justify-start px-4 overflow-hidden"
          style={{
            height: "100%",
            maxHeight: "100%",
            paddingTop: "calc(var(--head-h, 56px) + 8px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            overflow: "hidden"
          }}
        >
          <div className="text-center mb-1">
            <h1 className="text-2xl font-extrabold text-white mb-0.5">
              ❌⭕️ איקס עיגול
            </h1>
            <p className="text-white/70 text-xs">
              לוח {size}×{size} • {vsBot ? "נגד רובוט" : "2 שחקנים"}
            </p>
          </div>

          <div
            ref={controlsRef}
            className="grid grid-cols-3 gap-1 mb-1 w-full max-w-md"
          >
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">שחקן איקס</div>
              <div className="text-sm font-bold text-emerald-400">{score.X}</div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">תיקו</div>
              <div className="text-sm font-bold text-amber-400">{score.ties}</div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">שחקן עיגול</div>
              <div className="text-sm font-bold text-purple-400">{score.O}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="h-9 px-3 rounded-lg bg-black/30 border border-white/20 text-white text-sm font-bold"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}×{s}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-white/80">
              <input
                type="checkbox"
                checked={vsBot}
                onChange={(e) => {
                  setVsBot(e.target.checked);
                  resetBoard();
                }}
                className="w-5 h-5"
              />
              נגד רובוט
            </label>
            <button
              onClick={resetBoard}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
            >
              איפוס לוח
            </button>
            <button
              onClick={resetScore}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
            >
              איפוס ציון
            </button>
          </div>

          {winnerMessage && (
            <div className="mb-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-sm font-semibold">
              {winnerMessage}
            </div>
          )}

          <div
            ref={boardRef}
            className="w-full flex items-center justify-center mb-1 flex-1"
            style={{ 
              height: "var(--board-h, 400px)", 
              minHeight: "250px",
              width: "100%",
              maxWidth: "100%",
              flex: "1 1 auto"
            }}
          >
            <div
              className="grid gap-2 w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
                maxWidth: "min(95vw, 500px)",
                maxHeight: "100%",
                aspectRatio: "1 / 1"
              }}
            >
              {board.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMove(idx)}
                  disabled={!!cell || !!winner}
                  className="rounded-xl bg-black/30 border-2 border-white/15 text-6xl md:text-8xl font-bold flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/30 disabled:opacity-50 active:scale-95"
                >
                  {cellDisplay(cell)}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-sm text-white/80 font-semibold">
            תור: <span className="font-bold text-white text-lg">{playerLabel(currentPlayer)}</span>
          </div>
        </div>
        <StudentAdSlot variant="dvh" />
      </div>
    </Layout>
    </MaybeGameAccessGuard>
  );
}
