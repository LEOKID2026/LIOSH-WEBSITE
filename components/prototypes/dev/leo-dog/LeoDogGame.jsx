import { useCallback, useEffect, useRef, useState } from "react";

import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

import LeoDogVisual from "./LeoDogVisual.jsx";

import styles from "./LeoDogGame.module.css";

import {

  actionBath,

  actionFeed,

  actionPet,

  actionPlay,

  actionRest,

  advanceTime,

  applyTimeDecay,

  createDefaultState,

  loadState,

  saveState,

  STAT_LABELS,

  withMood,

  touchBelly,

  touchBody,

  touchHead,

  touchNose,

  touchPaw,

} from "../../../../lib/prototypes/leo-dog/leo-dog-state.js";

import {

  ACTION_DURATIONS,

  SLEEP_ENERGY_GAIN,

  SLEEP_ENERGY_TICK_MS,

  actionRemainingMs,

  createActionState,

  isActionBusy,

  mapActionToAnim,

} from "../../../../lib/prototypes/leo-dog/leo-dog-action-state.js";

import { ACTION_LINES, pickMoodLine } from "../../../../lib/prototypes/leo-dog/leo-dog-texts.js";

import {

  playBathSound,

  playEatSound,

  playHappySound,

  playPetSound,

  playPlaySound,

  playRestSound,

  playSneezeSound,

  playTapSound,

} from "../../../../lib/prototypes/leo-dog/leo-dog-sounds.js";

import {

  GAME_VISUAL_LABELS,

  GAME_VISUAL_MODES,

  loadGameVisualMode,

  LEO_FOOD_STEAK,

  resolveLeoSprite,

  saveGameVisualMode,

  spriteLabelFromSrc,

} from "../../../../lib/prototypes/leo-dog/leo-dog-assets.js";



/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogState} LeoDogState */

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-action-state.js').LeoDogCurrentAction} LeoDogCurrentAction */

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-assets.js').LeoDogGameVisualMode} LeoDogGameVisualMode */



const ACTIONS = [

  { id: "feed", emoji: "🍖", label: "אוכל" },

  { id: "bath", emoji: "🛁", label: "מקלחת" },

  { id: "play", emoji: "⚽", label: "משחק" },

  { id: "pet", emoji: "🤗", label: "ליטוף" },

  { id: "rest", emoji: "😴", label: "מנוחה", wakeEmoji: "☀️", wakeLabel: "להעיר" },

];



const STAT_KEYS = ["happiness", "cleanliness", "food", "energy", "missing"];



const STAT_BAR_CLASS = {

  happiness: styles.statBarHappiness,

  cleanliness: styles.statBarClean,

  food: styles.statBarFood,

  energy: styles.statBarEnergy,

  missing: styles.statBarMissing,

};



/** @typedef {{ id: string, type: string, x: number, y: number, long?: boolean }} Effect */



export default function LeoDogGame() {

  const [state, setState] = useState(() => createDefaultState());

  const [actionState, setActionState] = useState(createActionState);

  const [speech, setSpeech] = useState("");

  const [effects, setEffects] = useState(/** @type {Effect[]} */ ([]));

  const [hydrated, setHydrated] = useState(false);

  const [showRaw, setShowRaw] = useState(false);

  const [gameVisualMode, setGameVisualMode] = useState(/** @type {LeoDogGameVisualMode} */ ("sprites"));

  const [, setDebugTick] = useState(0);

  const effectId = useRef(0);

  const timersRef = useRef(/** @type {ReturnType<typeof setTimeout>[]} */ ([]));

  const isSleepingRef = useRef(false);

  const autoWakeScheduledRef = useRef(false);



  const scheduleAfter = useCallback((ms, fn) => {

    const id = setTimeout(fn, ms);

    timersRef.current.push(id);

    return id;

  }, []);



  const clearAllTimers = useCallback(() => {

    timersRef.current.forEach(clearTimeout);

    timersRef.current = [];

  }, []);



  useEffect(() => () => clearAllTimers(), [clearAllTimers]);



  useEffect(() => {

    isSleepingRef.current = actionState.isSleeping;

  }, [actionState.isSleeping]);



  useEffect(() => {

    if (!actionState.actionUntil && !actionState.isSleeping) return undefined;

    const iv = setInterval(() => setDebugTick((t) => t + 1), 500);

    return () => clearInterval(iv);

  }, [actionState.actionUntil, actionState.isSleeping]);



  useEffect(() => {

    const saved = loadState();

    const now = Date.now();

    const base = saved ? applyTimeDecay(saved, now) : createDefaultState(now);

    setState(base);

    setSpeech(pickMoodLine(base.mood));

    setHydrated(true);

    setGameVisualMode(loadGameVisualMode());

  }, []);



  useEffect(() => {

    if (!hydrated) return;

    saveGameVisualMode(gameVisualMode);

  }, [gameVisualMode, hydrated]);



  useEffect(() => {

    if (!hydrated) return;

    saveState(state);

  }, [state, hydrated]);



  const spawnEffect = useCallback((type, count = 3, durationMs = 1400, long = false) => {

    const items = [];

    for (let i = 0; i < count; i += 1) {

      effectId.current += 1;

      items.push({

        id: `fx-${effectId.current}`,

        type,

        x: 35 + Math.random() * 30,

        y: 25 + Math.random() * 35,

        long,

      });

    }

    setEffects((prev) => [...prev, ...items]);

    setTimeout(() => {

      setEffects((prev) => prev.filter((e) => !items.some((it) => it.id === e.id)));

    }, durationMs);

  }, []);



  const returnToIdleSpeech = useCallback(() => {

    setActionState(createActionState());

    setState((prev) => {

      setSpeech(pickMoodLine(prev.mood));

      return prev;

    });

  }, []);



  /** @param {LeoDogCurrentAction} currentAction @param {number} durationMs @param {string} [speechLine] */

  const beginAction = useCallback((currentAction, durationMs, speechLine) => {

    const now = Date.now();

    setActionState({

      currentAction,

      actionStartedAt: now,

      actionUntil: durationMs > 0 ? now + durationMs : 0,

      isSleeping: currentAction === "sleeping",

    });

    if (speechLine) setSpeech(speechLine);

  }, []);



  const wakeUp = useCallback(

    (auto = false) => {

      clearAllTimers();

      autoWakeScheduledRef.current = false;

      setActionState(createActionState());

      setSpeech(ACTION_LINES.wake);

      if (!auto) playHappySound();

    },

    [clearAllTimers],

  );



  const startSleep = useCallback(() => {

    clearAllTimers();

    setState((prev) => actionRest(prev));

    setActionState({

      currentAction: "sleeping",

      actionStartedAt: Date.now(),

      actionUntil: 0,

      isSleeping: true,

    });

    setSpeech(ACTION_LINES.restStart);

    playRestSound();

    scheduleAfter(1500, () => {

      if (isSleepingRef.current) setSpeech(ACTION_LINES.sleeping);

    });

  }, [clearAllTimers, scheduleAfter]);



  useEffect(() => {

    if (!actionState.isSleeping) return undefined;

    const iv = setInterval(() => {

      setState((prev) => ({

        ...prev,

        energy: Math.min(100, prev.energy + SLEEP_ENERGY_GAIN),

      }));

    }, SLEEP_ENERGY_TICK_MS);

    return () => clearInterval(iv);

  }, [actionState.isSleeping]);



  useEffect(() => {

    if (!actionState.isSleeping || state.energy < 100) {

      autoWakeScheduledRef.current = false;

      return;

    }

    if (autoWakeScheduledRef.current) return;

    autoWakeScheduledRef.current = true;

    scheduleAfter(ACTION_DURATIONS.autoWakeDelay, () => {

      if (isSleepingRef.current) wakeUp(true);

    });

  }, [actionState.isSleeping, state.energy, scheduleAfter, wakeUp]);



  const blockAction = useCallback(() => {

    if (actionState.isSleeping) return true;

    return isActionBusy(actionState.currentAction, false);

  }, [actionState]);



  const onFeed = useCallback(() => {

    if (blockAction()) return;

    setState((prev) => actionFeed(prev));

    beginAction("eating", ACTION_DURATIONS.eating, ACTION_LINES.feed);

    playEatSound();

    scheduleAfter(ACTION_DURATIONS.eating, returnToIdleSpeech);

  }, [blockAction, beginAction, scheduleAfter, returnToIdleSpeech]);



  const onBath = useCallback(() => {

    if (blockAction()) return;

    beginAction("bathing", ACTION_DURATIONS.bathing, ACTION_LINES.bathProgress);

    playBathSound();

    spawnEffect("bubble", 8, ACTION_DURATIONS.bathing + ACTION_DURATIONS.shaking);

    scheduleAfter(ACTION_DURATIONS.bathing, () => {

      setState((prev) => actionBath(prev));

      beginAction("shaking", ACTION_DURATIONS.shaking);

      scheduleAfter(ACTION_DURATIONS.shaking, () => {

        beginAction("bathAfterglow", ACTION_DURATIONS.bathAfterglow, ACTION_LINES.bathAfter);

        scheduleAfter(ACTION_DURATIONS.bathAfterglow, returnToIdleSpeech);

      });

    });

  }, [blockAction, beginAction, spawnEffect, scheduleAfter, returnToIdleSpeech]);



  const onPlay = useCallback(() => {

    if (blockAction()) return;

    setState((prev) => actionPlay(prev));

    beginAction("playing", ACTION_DURATIONS.playing, ACTION_LINES.play);

    playPlaySound();

    spawnEffect("ball", 1, ACTION_DURATIONS.playing + 300, true);

    spawnEffect("star", 2, ACTION_DURATIONS.playing);

    scheduleAfter(ACTION_DURATIONS.playing, () => {

      beginAction("playingAfterglow", ACTION_DURATIONS.playingAfterglow);

      scheduleAfter(ACTION_DURATIONS.playingAfterglow, returnToIdleSpeech);

    });

  }, [blockAction, beginAction, spawnEffect, scheduleAfter, returnToIdleSpeech]);



  const onPet = useCallback(() => {

    if (actionState.isSleeping) return;

    if (actionState.currentAction === "petting") {

      setActionState((prev) => ({

        ...prev,

        actionUntil: Date.now() + ACTION_DURATIONS.petting,

      }));

      spawnEffect("heart", 3, ACTION_DURATIONS.petting);

      playPetSound();

      return;

    }

    if (blockAction()) return;

    setState((prev) => actionPet(prev));

    beginAction("petting", ACTION_DURATIONS.petting, ACTION_LINES.pet);

    playPetSound();

    spawnEffect("heart", 4, ACTION_DURATIONS.petting);

    scheduleAfter(ACTION_DURATIONS.petting, returnToIdleSpeech);

  }, [actionState, blockAction, beginAction, spawnEffect, scheduleAfter, returnToIdleSpeech]);



  const onRest = useCallback(() => {

    if (actionState.isSleeping) {

      wakeUp(false);

      return;

    }

    if (blockAction()) return;

    startSleep();

  }, [actionState.isSleeping, blockAction, wakeUp, startSleep]);



  const runTouch = useCallback(

    (updater, touchAction, lineKey, soundFn, animForBusy = "petting") => {

      if (actionState.isSleeping) return;

      if (actionState.currentAction === animForBusy && animForBusy === "petting") {

        setActionState((prev) => ({

          ...prev,

          actionUntil: Date.now() + ACTION_DURATIONS.petting,

        }));

        spawnEffect("heart", 2, ACTION_DURATIONS.petting);

        soundFn?.();

        return;

      }

      if (blockAction()) return;

      setState((prev) => updater(prev));

      if (touchAction === "petting") {

        beginAction("petting", ACTION_DURATIONS.petting, ACTION_LINES[lineKey] ?? ACTION_LINES.pet);

        spawnEffect("heart", 3, ACTION_DURATIONS.petting);

        scheduleAfter(ACTION_DURATIONS.petting, returnToIdleSpeech);

      } else {

        beginAction("playingAfterglow", 1200, ACTION_LINES[lineKey] ?? pickMoodLine("happy"));

        scheduleAfter(1200, returnToIdleSpeech);

      }

      soundFn?.();

    },

    [actionState, blockAction, beginAction, spawnEffect, scheduleAfter, returnToIdleSpeech],

  );



  const onTouchHead = () => runTouch(touchHead, "petting", "touchHead", playPetSound);

  const onTouchNose = () => runTouch(touchNose, "nose", "touchNose", playSneezeSound, "idle");

  const onTouchBelly = () => runTouch(touchBelly, "belly", "touchBelly", playHappySound, "idle");

  const onTouchPaw = () => runTouch(touchPaw, "paw", "touchPaw", playTapSound, "idle");

  const onTouchBody = () => runTouch(touchBody, "body", "touchBody", playTapSound, "idle");



  const handleAction = (id) => {

    if (id === "feed") onFeed();

    else if (id === "bath") onBath();

    else if (id === "play") onPlay();

    else if (id === "pet") onPet();

    else if (id === "rest") onRest();

  };



  const debugAdvance = (hours) => {

    setState((prev) => {

      const next = advanceTime(prev, hours);

      setSpeech(pickMoodLine(next.mood));

      return next;

    });

  };



  const debugReset = () => {

    clearAllTimers();

    autoWakeScheduledRef.current = false;

    const fresh = createDefaultState();

    setState(fresh);

    setActionState(createActionState());

    setSpeech(pickMoodLine(fresh.mood));

    setEffects([]);

  };



  const debugDirty = () => {

    setState((prev) => {

      const next = withMood({ ...prev, cleanliness: 15, energy: 20 });

      setSpeech(pickMoodLine(next.mood));

      return next;

    });

  };



  const displayAnim = mapActionToAnim(actionState.currentAction, actionState.isSleeping);

  const currentSpriteSrc = resolveLeoSprite(state.mood, actionState.currentAction, {

    cleanliness: state.cleanliness,

    energy: state.energy,

  }, actionState.isSleeping);

  const remainingSec = (actionRemainingMs(actionState) / 1000).toFixed(1);



  if (!hydrated) {

    return (

      <DevPrototypeShell title="הכלב של ליאו" subtitle="טוען...">

        <div className="flex flex-1 items-center justify-center text-white/60 text-sm">טוען...</div>

      </DevPrototypeShell>

    );

  }



  return (

    <DevPrototypeShell

      title="הכלב של ליאו"

      subtitle="טפלו בליאו, שחקו איתו וראו איך הוא מגיב"

      headerExtra={<LinkBack href="/dev/solo-game-prototypes" />}

    >

      <div className={styles.root}>

        <div className={styles.main}>

          <div className={styles.statsRow}>

            {STAT_KEYS.map((key) => (

              <div key={key} className={styles.statChip}>

                <span className={styles.statLabel}>{STAT_LABELS[key]}</span>

                <div className={styles.statBarTrack}>

                  <div

                    className={`${styles.statBarFill} ${STAT_BAR_CLASS[key]}`}

                    style={{ width: `${state[key]}%` }}

                  />

                </div>

              </div>

            ))}

          </div>



          <div className={styles.scene}>

            <div className={styles.roomDecor} aria-hidden>

              <div className={`${styles.cloud} ${styles.cloud1}`} />

              <div className={`${styles.cloud} ${styles.cloud2}`} />

              <div className={styles.fence} />

              <div className={styles.grassPatch} />

            </div>



            {speech ? (

              <p className={styles.speechBubble} key={speech}>

                {speech}

              </p>

            ) : null}



            <LeoDogVisual

              gameVisualMode={gameVisualMode}

              anim={displayAnim}

              currentAction={actionState.currentAction}

              isSleeping={actionState.isSleeping}

              mood={state.mood}

              cleanliness={state.cleanliness}

              energy={state.energy}

              onTouchHead={onTouchHead}

              onTouchNose={onTouchNose}

              onTouchBelly={onTouchBelly}

              onTouchPaw={onTouchPaw}

              onTouchBody={onTouchBody}

            />



            {actionState.currentAction === "eating" ? (

              <img

                src={LEO_FOOD_STEAK}

                alt=""

                className={styles.foodSteak}

                draggable={false}

                aria-hidden

              />

            ) : null}



            <div className={styles.effectsLayer} aria-hidden>

              {effects.map((fx) => {

                if (fx.type === "heart") {

                  return (

                    <span

                      key={fx.id}

                      className={styles.heart}

                      style={{ left: `${fx.x}%`, top: `${fx.y}%` }}

                    >

                      ❤️

                    </span>

                  );

                }

                if (fx.type === "bubble") {

                  return (

                    <span

                      key={fx.id}

                      className={styles.bubble}

                      style={{ left: `${fx.x}%`, top: `${fx.y + 20}%` }}

                    />

                  );

                }

                if (fx.type === "star") {

                  return (

                    <span

                      key={fx.id}

                      className={styles.star}

                      style={{ left: `${fx.x + 10}%`, top: `${fx.y}%` }}

                    >

                      ⭐

                    </span>

                  );

                }

                if (fx.type === "ball") {

                  return (

                    <span

                      key={fx.id}

                      className={`${styles.ball} ${fx.long ? styles.ballLong : ""}`}

                    />

                  );

                }

                if (fx.type === "bowl") {

                  return (

                    <span key={fx.id} className={styles.foodBowl}>

                      🍲

                    </span>

                  );

                }

                return null;

              })}

            </div>

          </div>



          <div className={styles.actionsRow}>

            {ACTIONS.map((a) => {

              const isWake = a.id === "rest" && actionState.isSleeping;

              return (

                <button

                  key={a.id}

                  type="button"

                  className={styles.actionBtn}

                  onClick={() => handleAction(a.id)}

                >

                  <span className={styles.actionEmoji} aria-hidden>

                    {isWake ? a.wakeEmoji : a.emoji}

                  </span>

                  {isWake ? a.wakeLabel : a.label}

                </button>

              );

            })}

          </div>

        </div>



        <div className={styles.debugPanel}>

          <p className={styles.debugTitle}>🛠️ Debug (אדמין)</p>

          <div className={styles.debugBtns}>

            {GAME_VISUAL_MODES.map((mode) => (

              <button

                key={mode}

                type="button"

                className={`${styles.debugBtn} ${gameVisualMode === mode ? styles.debugBtnActive : ""}`}

                onClick={() => setGameVisualMode(mode)}

              >

                {GAME_VISUAL_LABELS[mode]}

              </button>

            ))}

          </div>

          <div className={styles.debugBtns}>

            <button type="button" className={styles.debugBtn} onClick={() => debugAdvance(1)}>

              +1 שעה

            </button>

            <button type="button" className={styles.debugBtn} onClick={() => debugAdvance(24)}>

              +1 יום

            </button>

            <button type="button" className={styles.debugBtn} onClick={() => debugAdvance(72)}>

              +3 ימים

            </button>

            <button type="button" className={styles.debugBtn} onClick={debugDirty}>

              לכלך

            </button>

            <button type="button" className={styles.debugBtn} onClick={debugReset}>

              איפוס

            </button>

            <button type="button" className={styles.debugBtn} onClick={() => setShowRaw((v) => !v)}>

              {showRaw ? "הסתר state" : "הצג state"}

            </button>

          </div>

          {showRaw ? (

            <p className={styles.debugRaw}>

              {JSON.stringify({

                happiness: state.happiness,

                cleanliness: state.cleanliness,

                food: state.food,

                energy: state.energy,

                missing: state.missing,

                bond: state.bond,

                mood: state.mood,

                currentAction: actionState.currentAction,

                currentSprite: spriteLabelFromSrc(currentSpriteSrc),

                isSleeping: actionState.isSleeping,

                actionRemainingSec: Number(remainingSec) > 0 ? remainingSec : null,

              })}

            </p>

          ) : null}

        </div>

      </div>

    </DevPrototypeShell>

  );

}



function LinkBack({ href }) {

  return (

    <a

      href={href}

      className="text-xs font-bold text-amber-300/80 hover:text-amber-200 whitespace-nowrap"

    >

      אבטיפוסים

    </a>

  );

}


