import { useCallback, useEffect, useRef, useState } from "react";

import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import { pieceTileStyle, splitTrayPieces } from "../../../lib/solo-games/picture-puzzle-placement.js";

function isMobileViewport() {

  if (typeof window === "undefined") return false;

  return window.matchMedia("(max-width: 1023px)").matches;

}



function isPortraitViewport() {

  if (typeof window === "undefined") return false;

  return window.matchMedia("(orientation: portrait)").matches;

}



function useSquareBoardSize() {

  const areaRef = useRef(null);

  const [size, setSize] = useState(0);



  const measure = useCallback(() => {

    const el = areaRef.current;

    if (!el) return;

    const { width, height } = el.getBoundingClientRect();

    setSize(Math.max(0, Math.floor(Math.min(width, height))));

  }, []);



  useEffect(() => {

    measure();

    const el = areaRef.current;

    if (!el) return undefined;

    const ro = new ResizeObserver(measure);

    ro.observe(el);

    window.addEventListener("resize", measure);

    window.addEventListener("orientationchange", measure);

    return () => {

      ro.disconnect();

      window.removeEventListener("resize", measure);

      window.removeEventListener("orientationchange", measure);

    };

  }, [measure]);



  return { areaRef, squareSize: size };

}



function PuzzlePieceTile({ imageSrc, gridSize, tileIndex, className = "" }) {

  return (

    <div

      className={`h-full w-full bg-slate-900 ${className}`.trim()}

      dir="ltr"

      style={pieceTileStyle(gridSize, tileIndex, imageSrc)}

      role="presentation"

      aria-hidden

    />

  );

}



function TrayGrid({

  pieces,

  gridSize,

  puzzleImage,

  gameRunning,

  gameOver,

  selectedPiece,

  returnTarget,

  trayCols,

  label,

  onTrayPieceClick,

  onReturnToTray,

  onDragStart,

  portraitMobile = false,

  hideLabel = false,

  singleRow = false,

}) {

  return (

    <aside

      className={`flex min-h-0 flex-col overflow-hidden ${

        portraitMobile ? "puzzle-tray-portrait" : ""

      } ${hideLabel ? (singleRow ? "w-full shrink-0" : "min-h-0 w-full flex-1") : ""} ${returnTarget ? "ring-2 ring-sky-400/40 rounded-lg" : ""}`}

      onClick={() => {

        if (returnTarget) onReturnToTray();

      }}

    >

      {!hideLabel ? (
      <p className="mb-0.5 shrink-0 text-center text-[10px] font-bold text-yellow-200 sm:text-xs">

        {label} ({pieces.length})

        {returnTarget ? " · לחצו להחזיר" : ""}

      </p>
      ) : null}

      <div

        className={`puzzle-tray-grid grid content-start gap-0.5 sm:gap-1 ${

          singleRow

            ? "puzzle-tray-grid-single-row shrink-0 overflow-visible"

            : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden"

        }`}

        style={{

          ...(singleRow && pieces.length > 0

            ? { "--tray-piece-count": pieces.length }

            : {}),

          ...(!portraitMobile && !singleRow

            ? { gridTemplateColumns: `repeat(${trayCols}, minmax(0, 1fr))` }

            : {}),

        }}

      >

        {pieces.map((piece) => {

          const selected =

            selectedPiece?.source === "tray" && selectedPiece.pieceId === piece.pieceId;

          return (

            <button

              key={`tray-${piece.pieceId}`}

              type="button"

              draggable={gameRunning && !gameOver}

              onDragStart={(e) => onDragStart(e, piece.pieceId)}

              onClick={(e) => {

                e.stopPropagation();

                onTrayPieceClick(piece.pieceId);

              }}

              className={`puzzle-tray-piece aspect-square overflow-hidden rounded-md border-2 bg-slate-900 shadow-md transition touch-manipulation active:scale-[0.97] sm:rounded-lg ${

                portraitMobile ? "" : "w-full min-h-[40px] sm:min-h-[48px]"

              } ${

                selected

                  ? "border-sky-300 ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900"

                  : "border-yellow-300/70 hover:border-yellow-200"

              }`}

              aria-label={`חלק ${piece.pieceId + 1}${selected ? " - נבחר" : ""}`}

            >

              <PuzzlePieceTile

                imageSrc={puzzleImage}

                gridSize={gridSize}

                tileIndex={piece.tileIndex}

                className="h-full w-full rounded-sm"

              />

            </button>

          );

        })}

      </div>

    </aside>

  );

}



/**

 * Slot / placement play surface — free-move puzzle with tap + drag.

 */

export default function MleoPicturePuzzlePlacementPlay({

  puzzleImage,

  gridSize,

  settings,

  gameRunning,

  gameOver,

  won,

  timeLeft,

  moves,

  boardSlots,

  trayPieces,

  selectedPiece,

  showHintPreview,

  onSelectTrayPiece,

  onSelectBoardSlot,

  onReturnToTray,

  onTriggerHint,

  onCloseHint,

  isFullscreen,

  showFullscreenButton,

  toggleFromUserGesture,

  computeWinScore,

}) {

  const { areaRef, squareSize } = useSquareBoardSize();

  const [isPortraitFullscreen, setIsPortraitFullscreen] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsPortraitFullscreen(
        isFullscreen && isPortraitViewport() && isMobileViewport(),
      );
    };
    update();
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, [isFullscreen]);

  const handleDragStart = (event, pieceId, sourceSlotId = null) => {

    if (sourceSlotId != null) {

      onSelectBoardSlot(sourceSlotId);

    } else {

      onSelectTrayPiece(pieceId);

    }

    event.dataTransfer.setData(

      "text/plain",

      JSON.stringify({ pieceId, sourceSlotId })

    );

    event.dataTransfer.effectAllowed = "move";

  };



  const handleDropOnSlot = (event, slotId) => {

    event.preventDefault();

    try {

      const raw = event.dataTransfer.getData("text/plain");

      if (raw.startsWith("{")) {

        const data = JSON.parse(raw);

        if (data.sourceSlotId != null) onSelectBoardSlot(data.sourceSlotId);

        else onSelectTrayPiece(data.pieceId);

      }

    } catch {

      /* use current selection */

    }

    onSelectBoardSlot(slotId);

  };



  const placedCount = boardSlots.filter((s) => s.placedPieceId != null).length;

  const totalSlots = boardSlots.length;

  const trayCols = gridSize >= 5 ? 3 : 2;

  const { first: trayFirst, second: traySecond } = splitTrayPieces(trayPieces);

  const returnTarget = selectedPiece?.source === "board";



  const renderSlot = (slot) => {

    const filled = slot.placedPieceId != null;

    const isSelected =

      selectedPiece?.source === "board" && selectedPiece.sourceSlotId === slot.slotId;

    const isDropTarget =

      selectedPiece != null &&

      !(selectedPiece.source === "board" && selectedPiece.sourceSlotId === slot.slotId);



    if (filled) {

      return (

        <button

          key={`slot-${slot.slotId}`}

          type="button"

          draggable={gameRunning && !gameOver}

          onDragStart={(e) => handleDragStart(e, slot.placedPieceId, slot.slotId)}

          onClick={() => onSelectBoardSlot(slot.slotId)}

          className={`aspect-square overflow-hidden touch-manipulation transition ${

            isSelected

              ? "ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-950"

              : isDropTarget

                ? "ring-1 ring-sky-300/50"

                : "ring-1 ring-white/15"

          }`}

          aria-label={`חלק ${slot.placedPieceId + 1}${isSelected ? " - נבחר" : ""}`}

        >

          <PuzzlePieceTile

            imageSrc={puzzleImage}

            gridSize={gridSize}

            tileIndex={slot.placedPieceId}

            className="h-full w-full"

          />

        </button>

      );

    }



    return (

      <button

        key={`slot-${slot.slotId}`}

        type="button"

        disabled={!gameRunning || gameOver}

        onClick={() => onSelectBoardSlot(slot.slotId)}

        onDragOver={(e) => {

          if (gameRunning && !gameOver) e.preventDefault();

        }}

        onDrop={(e) => handleDropOnSlot(e, slot.slotId)}

        className={`aspect-square touch-manipulation border border-dashed transition ${

          isDropTarget

            ? "border-sky-300/90 bg-slate-900 ring-2 ring-sky-400/35"

            : "border-white/25 bg-slate-900"

        }`}

        aria-label="משבצת ריקה"

      />

    );

  };



  return (

    <div

      className={`picture-puzzle-play-root relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-0.5 pb-0.5 pt-0.5 sm:px-1 ${

        isPortraitFullscreen ? "picture-puzzle-portrait-fullscreen" : ""

      }`}

    >

      <div className="picture-puzzle-score-bar pointer-events-none absolute left-1/2 top-1 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-2 py-1 text-center text-[10px] font-bold leading-snug sm:top-1.5 sm:px-3 sm:py-1.5 sm:text-sm">

        <span className="text-amber-300">ניקוד: {won ? computeWinScore(timeLeft, moves) : 0}</span>

        {" · "}

        <span>מהלכים: {moves}</span>

        {" · "}

        <span>{timeLeft} שנ׳</span>

        {" · "}

        <span>

          {placedCount}/{totalSlots}

        </span>

      </div>



      <div className="picture-puzzle-play-frame relative z-0 mx-auto mt-8 flex h-full min-h-0 w-full max-w-[1280px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg sm:mt-9">

        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden gap-1 p-1 max-lg:landscape:flex-row lg:flex-row sm:gap-2 sm:p-2">

          {/* Desktop left sidebar */}

          <aside className="hidden shrink-0 flex-col items-stretch justify-center gap-1.5 lg:flex lg:w-[88px] lg:gap-2">

            <div className="rounded-lg border border-yellow-400/40 bg-black/35 p-1.5 text-center text-xs font-semibold text-yellow-100/90">

              {settings.label}

            </div>

            {selectedPiece ? (

              <p className="text-center text-xs font-bold leading-tight text-sky-200">

                {selectedPiece.source === "tray" ? "לחצו על משבצת" : "הזיזו או החזירו למגש"}

              </p>

            ) : (

              <p className="text-center text-xs font-semibold leading-tight text-white/60">בחרו חלק</p>

            )}

            <button

              type="button"

              onClick={onTriggerHint}

              disabled={!gameRunning || gameOver}

              className="min-h-[44px] rounded-xl border-2 border-sky-400 bg-sky-950/60 px-2 py-2 text-xs font-bold leading-tight text-sky-100 disabled:opacity-40"

              style={{ touchAction: "manipulation" }}

            >

              💡 הצג תמונה

            </button>

          </aside>



          {/* Mobile portrait - top tray + hint */}

          <div className="puzzle-tray-portrait-top shrink-0 max-lg:landscape:hidden lg:hidden">

            <div

              className={`puzzle-tray-hint-row flex w-full shrink-0 items-center px-0.5 ${

                showFullscreenButton ? "justify-between" : "justify-end"

              }`}

            >

              {showFullscreenButton ? (

                <SoloGameMobileFullscreenButton

                  isFullscreen={isFullscreen}

                  onToggle={toggleFromUserGesture}

                  variant="compact"

                />

              ) : null}

              <button

                type="button"

                onClick={onTriggerHint}

                disabled={!gameRunning || gameOver}

                className="puzzle-tray-hint-btn shrink-0 rounded-md border border-sky-400/70 bg-sky-950/70 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-sky-100 disabled:opacity-40"

                style={{ touchAction: "manipulation" }}

              >

                💡 הצג תמונה

              </button>

            </div>

            <TrayGrid

              pieces={trayFirst}

              gridSize={gridSize}

              puzzleImage={puzzleImage}

              gameRunning={gameRunning}

              gameOver={gameOver}

              selectedPiece={selectedPiece}

              returnTarget={returnTarget}

              trayCols={trayCols}

              label="מגש עליון 🧩"

              onTrayPieceClick={onSelectTrayPiece}

              onReturnToTray={onReturnToTray}

              onDragStart={(e, id) => handleDragStart(e, id)}

              portraitMobile

              hideLabel

              singleRow

            />

          </div>



          {/* Mobile landscape - left tray */}

          <div className="hidden min-h-0 w-[72px] shrink-0 max-lg:landscape:flex max-lg:landscape:flex-col sm:w-[88px] lg:hidden">

            <TrayGrid

              pieces={trayFirst}

              gridSize={gridSize}

              puzzleImage={puzzleImage}

              gameRunning={gameRunning}

              gameOver={gameOver}

              selectedPiece={selectedPiece}

              returnTarget={returnTarget}

              trayCols={2}

              label="מגש 🧩"

              onTrayPieceClick={onSelectTrayPiece}

              onReturnToTray={onReturnToTray}

              onDragStart={(e, id) => handleDragStart(e, id)}

            />

          </div>



          {/* Board - always square */}

          <div

            ref={areaRef}

            className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"

          >

            <button

              type="button"

              onClick={onTriggerHint}

              disabled={!gameRunning || gameOver}

              className="absolute left-1 top-1 z-10 hidden min-h-[36px] shrink-0 rounded-lg border border-sky-400/70 bg-sky-950/70 px-2 py-1 text-[10px] font-bold text-sky-100 disabled:opacity-40 max-lg:landscape:block lg:hidden"

              style={{ touchAction: "manipulation" }}

            >

              💡 הצג תמונה

            </button>

            {showFullscreenButton ? (

              <div className="absolute right-1 top-1 z-10 hidden max-lg:landscape:block lg:hidden">

                <SoloGameMobileFullscreenButton

                  isFullscreen={isFullscreen}

                  onToggle={toggleFromUserGesture}

                />

              </div>

            ) : null}



            <div

              dir="ltr"

              style={{

                direction: "ltr",

                width: squareSize > 0 ? squareSize : "min(100%, 100%)",

                height: squareSize > 0 ? squareSize : "auto",

                aspectRatio: "1 / 1",

                maxWidth: "100%",

                maxHeight: "100%",

              }}

            >

              <div

                className="grid h-full w-full gap-0 rounded-lg border-2 border-yellow-400/80 bg-slate-950 p-0 shadow-inner"

                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}

              >

                {boardSlots.map(renderSlot)}

              </div>

            </div>

          </div>



          {/* Mobile portrait - bottom tray */}

          <div className="puzzle-tray-portrait-bottom max-h-[22%] min-h-0 shrink-0 max-lg:landscape:hidden lg:hidden">

            <TrayGrid

              pieces={traySecond}

              gridSize={gridSize}

              puzzleImage={puzzleImage}

              gameRunning={gameRunning}

              gameOver={gameOver}

              selectedPiece={selectedPiece}

              returnTarget={returnTarget}

              trayCols={trayCols}

              label="מגש תחתון 🧩"

              onTrayPieceClick={onSelectTrayPiece}

              onReturnToTray={onReturnToTray}

              onDragStart={(e, id) => handleDragStart(e, id)}

              portraitMobile

              hideLabel

            />

          </div>



          {/* Mobile landscape - right tray */}

          <div className="hidden min-h-0 w-[72px] shrink-0 max-lg:landscape:flex max-lg:landscape:flex-col sm:w-[88px] lg:hidden">

            <TrayGrid

              pieces={traySecond}

              gridSize={gridSize}

              puzzleImage={puzzleImage}

              gameRunning={gameRunning}

              gameOver={gameOver}

              selectedPiece={selectedPiece}

              returnTarget={returnTarget}

              trayCols={2}

              label="מגש 🧩"

              onTrayPieceClick={onSelectTrayPiece}

              onReturnToTray={onReturnToTray}

              onDragStart={(e, id) => handleDragStart(e, id)}

            />

          </div>



          {/* Desktop - right tray (all pieces) */}

          <aside className="hidden min-h-0 w-[128px] shrink-0 flex-col overflow-hidden lg:flex md:w-[148px]">

            <TrayGrid

              pieces={trayPieces}

              gridSize={gridSize}

              puzzleImage={puzzleImage}

              gameRunning={gameRunning}

              gameOver={gameOver}

              selectedPiece={selectedPiece}

              returnTarget={returnTarget}

              trayCols={trayCols}

              label="מגש 🧩"

              onTrayPieceClick={onSelectTrayPiece}

              onReturnToTray={onReturnToTray}

              onDragStart={(e, id) => handleDragStart(e, id)}

            />

          </aside>

        </div>



        {showHintPreview ? (

          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">

            <div className="relative pointer-events-auto">

              <button

                type="button"

                onClick={onCloseHint}

                className="puzzle-hint-close absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/80 text-base font-bold leading-none text-white shadow-md"

                style={{ touchAction: "manipulation" }}

                aria-label="סגור תמונה"

              >

                ×

              </button>

              <img

                src={puzzleImage}

                alt=""

                className="mx-auto max-h-[min(62vh,420px)] max-w-[min(88vw,420px)] rounded-xl object-contain ring-4 ring-sky-400"

              />

            </div>

          </div>

        ) : null}


      </div>

    </div>

  );

}


