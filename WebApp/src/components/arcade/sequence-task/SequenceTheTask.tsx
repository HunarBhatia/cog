"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./SequenceTheTask.css";
import { getRecommendedLevel, sendGameResult } from "./gameApi";
import { useAuth } from "@/components/auth/AuthContext";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const TOTAL_LEVELS = 10;

/** Time limit in seconds per level: 180s at L1 → 50s at L10 */
const LEVEL_TIME_LIMITS: Record<number, number> = {
  1: 180, 2: 165, 3: 150, 4: 135, 5: 120,
  6: 105, 7: 90,  8: 75,  9: 60,  10: 50,
};

function getTimeLimit(level: number): number {
  return LEVEL_TIME_LIMITS[level] ?? 50;
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

type GameStatus = "ready" | "playing" | "done" | "timeout";

type Activity = {
  id: string;
  label: string;
  emoji: string;
  order: number;
};

type SessionRecord = {
  date: string;
  level: number;
  steps: number;
  moveCount: number;
  wrongChecks: number;
  timeTakenMs: number;
  success: boolean;
};

const ACTIVITIES: Activity[] = [
  { id: "wake",       label: "Wake Up",                emoji: "☀️",  order: 1  },
  { id: "prayer",     label: "Morning Prayer",          emoji: "🙏",  order: 2  },
  { id: "water",      label: "Drink Water",             emoji: "💧",  order: 3  },
  { id: "toilet",     label: "Use the Bathroom",        emoji: "🚻",  order: 4  },
  { id: "brush",      label: "Brush Teeth",             emoji: "🪥",  order: 5  },
  { id: "washface",   label: "Wash Face",               emoji: "🧼",  order: 6  },
  { id: "bath",       label: "Take a Bath",             emoji: "🛁",  order: 7  },
  { id: "dress",      label: "Get Dressed",             emoji: "👕",  order: 8  },
  { id: "comb",       label: "Comb Hair",               emoji: "💇",  order: 9  },
  { id: "tea",        label: "Have Morning Tea",         emoji: "☕",  order: 10 },
  { id: "newspaper",  label: "Read Newspaper",           emoji: "📰",  order: 11 },
  { id: "walk",       label: "Morning Walk",             emoji: "🚶",  order: 12 },
  { id: "plants",     label: "Water Plants",             emoji: "🪴",  order: 13 },
  { id: "sweep",      label: "Sweep the Room",           emoji: "🧹",  order: 14 },
  { id: "tidy",       label: "Tidy the Room",            emoji: "🧺",  order: 15 },
  { id: "breakfast",  label: "Eat Breakfast",            emoji: "🍚",  order: 16 },
  { id: "dishes",     label: "Wash Dishes",              emoji: "🍽️", order: 17 },
  { id: "cook",       label: "Prepare Food",             emoji: "🍳",  order: 18 },
  { id: "garden",     label: "Work in the Garden",       emoji: "🌱",  order: 19 },
  { id: "shopping",   label: "Go Shopping",              emoji: "🛍️", order: 20 },
  { id: "market",     label: "Visit the Market",         emoji: "🏪",  order: 21 },
  { id: "lunch",      label: "Eat Lunch",                emoji: "🍛",  order: 22 },
  { id: "rest",       label: "Take a Rest",              emoji: "🛋️", order: 23 },
  { id: "family",     label: "Talk with Family",         emoji: "👨‍👩‍👧‍👦", order: 24 },
  { id: "tea2",       label: "Have Evening Tea",         emoji: "🍵",  order: 25 },
  { id: "medicine",   label: "Take Prescribed Medicine", emoji: "💊",  order: 26 },
  { id: "dinner",     label: "Eat Dinner",               emoji: "🍲",  order: 27 },
  { id: "washdishes", label: "Clean the Dishes",         emoji: "🫧",  order: 28 },
  { id: "preparebed", label: "Prepare for Bed",          emoji: "🛏️", order: 29 },
  { id: "sleep",      label: "Go to Sleep",              emoji: "😴",  order: 30 },
];

const LEVEL_CONFIG: Record<number, { steps: number; shuffleMoves: number }> = {
  1:  { steps: 4, shuffleMoves: 2  },
  2:  { steps: 4, shuffleMoves: 3  },
  3:  { steps: 5, shuffleMoves: 4  },
  4:  { steps: 5, shuffleMoves: 5  },
  5:  { steps: 6, shuffleMoves: 6  },
  6:  { steps: 6, shuffleMoves: 7  },
  7:  { steps: 7, shuffleMoves: 8  },
  8:  { steps: 7, shuffleMoves: 9  },
  9:  { steps: 8, shuffleMoves: 11 },
  10: { steps: 8, shuffleMoves: 13 },
};

function getRandomActivities(count: number): Activity[] {
  const shuffled = [...ACTIVITIES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).sort((a, b) => a.order - b.order);
}

function shuffleActivities(activities: Activity[], shuffleMoves: number): Activity[] {
  if (activities.length < 2) return [...activities];
  let result = [...activities];
  for (let i = 0; i < shuffleMoves; i++) {
    const first = Math.floor(Math.random() * result.length);
    let second = Math.floor(Math.random() * result.length);
    while (second === first) second = Math.floor(Math.random() * result.length);
    [result[first], result[second]] = [result[second], result[first]];
  }
  const alreadyCorrect = result.every((a, i) => a.id === activities[i].id);
  if (alreadyCorrect) return shuffleActivities(activities, shuffleMoves);
  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SequenceTheTask() {
  const { token } = useAuth();

  // IRT state
  const [irtLevel,      setIrtLevel]      = useState<number | null>(null);
  const [nextIrtLevel,  setNextIrtLevel]  = useState<number | null>(null);
  const [thetaInfo,     setThetaInfo]     = useState<{ old: number; new: number } | null>(null);

  // Game state
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [completedLevel,  setCompletedLevel]  = useState<number | null>(null);
  const [status,          setStatus]          = useState<GameStatus>("ready");
  const [correctOrder,    setCorrectOrder]    = useState<Activity[]>([]);
  const [steps,           setSteps]           = useState<Activity[]>([]);
  const [selectedIndex,   setSelectedIndex]   = useState<number | null>(null);
  const [moveCount,       setMoveCount]       = useState(0);
  const [wrongChecks,     setWrongChecks]     = useState(0);
  const [startTime,       setStartTime]       = useState<number | null>(null);
  const [history,         setHistory]         = useState<SessionRecord[]>([]);
  const [feedback,        setFeedback]        = useState("");
  const [timeLeft,        setTimeLeft]        = useState(() => getTimeLimit(1));

  const timeLimit = getTimeLimit(difficultyLevel);

  // Refs for stale-closure safety
  const resultSentRef   = useRef(false);
  const initializedRef  = useRef(false);
  const moveCountRef    = useRef(0);
  const wrongChecksRef  = useRef(0);
  const startTimeRef    = useRef<number | null>(null);
  const correctOrderRef = useRef<Activity[]>([]);
  const stepsRef        = useRef<Activity[]>([]);

  useEffect(() => { moveCountRef.current    = moveCount;    }, [moveCount]);
  useEffect(() => { wrongChecksRef.current  = wrongChecks;  }, [wrongChecks]);
  useEffect(() => { startTimeRef.current    = startTime;    }, [startTime]);
  useEffect(() => { correctOrderRef.current = correctOrder; }, [correctOrder]);
  useEffect(() => { stepsRef.current        = steps;        }, [steps]);

  // Timer urgency
  const timerClass    = timeLeft <= 15 ? "timer-urgent" : timeLeft <= 30 ? "timer-warning" : "";
  const timeProgress  = (timeLeft / timeLimit) * 100;
  const thetaDelta    = thetaInfo ? thetaInfo.new - thetaInfo.old : 0;
  const irtBadgeClass = thetaDelta > 0.001 ? "theta-up" : thetaDelta < -0.001 ? "theta-down" : "";

  // ── IRT: fetch recommended level once on mount ──────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    getRecommendedLevel("daily_routine").then((recommended) => {
      setIrtLevel(recommended);
      setDifficultyLevel(recommended);
      setTimeLeft(getTimeLimit(recommended));
    });
  }, []);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // ── Timeout detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      finishSession(false);
    }
  }, [timeLeft, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create a new attempt ─────────────────────────────────────────────────
  const createNewAttempt = (level: number) => {
    const config   = LEVEL_CONFIG[level];
    const routine  = getRandomActivities(config.steps);
    const shuffled = shuffleActivities(routine, config.shuffleMoves);
    setCorrectOrder(routine);
    setSteps(shuffled);
    setSelectedIndex(null);
    setMoveCount(0);
    setWrongChecks(0);
    setFeedback("");
    const now = Date.now();
    setStartTime(now);
    startTimeRef.current = now;
    setTimeLeft(getTimeLimit(level));
    setStatus("playing");
    resultSentRef.current = false;
  };

  const startGame = () => createNewAttempt(difficultyLevel);

  const tryAgain = () => {
    const lvl = completedLevel ?? difficultyLevel;
    setDifficultyLevel(lvl);
    setNextIrtLevel(null);
    setThetaInfo(null);
    createNewAttempt(lvl);
  };

  const goToNextLevel = () => {
    const next = Math.max(1, Math.min(TOTAL_LEVELS, nextIrtLevel ?? Math.min(TOTAL_LEVELS, difficultyLevel + 1)));
    setDifficultyLevel(next);
    setCompletedLevel(null);
    setNextIrtLevel(null);
    setThetaInfo(null);
    setCorrectOrder([]);
    setSteps([]);
    setSelectedIndex(null);
    setMoveCount(0);
    setWrongChecks(0);
    setFeedback("");
    setStartTime(null);
    setTimeLeft(getTimeLimit(next));
    setStatus("ready");
    resultSentRef.current = false;
  };

  // ── Tile tap (swap) ──────────────────────────────────────────────────────
  const handleTileTap = (index: number) => {
    if (status !== "playing") return;
    setFeedback("");
    if (selectedIndex === null) { setSelectedIndex(index); return; }
    if (selectedIndex === index) { setSelectedIndex(null); return; }
    setSteps(curr => {
      const copy = [...curr];
      [copy[selectedIndex], copy[index]] = [copy[index], copy[selectedIndex]];
      return copy;
    });
    setMoveCount(n => n + 1);
    setSelectedIndex(null);
  };

  // ── Move up/down ─────────────────────────────────────────────────────────
  const moveStep = (index: number, direction: number) => {
    if (status !== "playing") return;
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps(curr => {
      const copy = [...curr];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
    setMoveCount(n => n + 1);
    setSelectedIndex(null);
    setFeedback("");
  };

  // ── Check order ──────────────────────────────────────────────────────────
  const checkOrder = () => {
    if (status !== "playing" || correctOrder.length === 0 || steps.length === 0) return;
    const isCorrect = steps.length === correctOrder.length &&
      steps.every((step, i) => step.id === correctOrder[i].id);
    if (isCorrect) {
      finishSession(true);
    } else {
      setWrongChecks(n => n + 1);
      setFeedback("Not quite in order yet — check the numbers and try again.");
    }
  };

  // ── Finish session (win OR timeout) ──────────────────────────────────────
  const finishSession = (success: boolean) => {
    if (resultSentRef.current) return;
    resultSentRef.current = true;

    const currentLevel = difficultyLevel;
    const timeTakenMs  = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const mc = moveCountRef.current;
    const wc = wrongChecksRef.current;
    const co = correctOrderRef.current;
    const st = stepsRef.current;

    setCompletedLevel(currentLevel);
    setStatus(success ? "done" : "timeout");

    // Score: win = efficiency, timeout = partial credit (matched-in-place ÷ total × 50)
    const correctInPlace = success
      ? 0
      : co.filter((a, i) => st[i]?.id === a.id).length;
    const score = success
      ? Math.max(0, Math.min(100, Math.round(100 - wc * 10 - Math.max(0, mc - co.length) * 2)))
      : Math.round((correctInPlace / Math.max(co.length, 1)) * 50);

    const record: SessionRecord = {
      date: new Date().toISOString(),
      level: currentLevel,
      steps: co.length,
      moveCount: mc,
      wrongChecks: wc,
      timeTakenMs,
      success,
    };
    setHistory(prev => [...prev, record]);

    // Send to IRT → get next level
    sendGameResult({
      gameId: "sequence_the_task",
      playerName: "Patient",
      score,
      completed: success,
      timeSeconds: Math.round(timeTakenMs / 1000),
      moves: mc,
      stepsInRoutine: co.length,
      wrongChecks: wc,
    }, currentLevel, success ? 1 : 0, token
    ).then((irtResponse) => {
      if (irtResponse) setThetaInfo({ old: irtResponse.theta_old, new: irtResponse.theta_new });
      return getRecommendedLevel("daily_routine");
    }).then(setNextIrtLevel)
      .catch(() => getRecommendedLevel("daily_routine").then(setNextIrtLevel));
  };

  const isTileCorrectPosition = (step: Activity, index: number) =>
    status === "done" || (correctOrder[index] && correctOrder[index].id === step.id);

  const currentConfig = LEVEL_CONFIG[difficultyLevel];
  const resultLevel   = completedLevel ?? difficultyLevel;
  const lastFiveTimes = history.slice(-5).map(r => r.timeTakenMs);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="st-screen">

      {/* Back nav + IRT badge */}
      <div className="st-back-row">
        <Link href="/arcade" className="st-back-link">
          <ArrowLeft style={{ width: 14, height: 14, color: "#fb8c00" }} />
          Back to Arcade
        </Link>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {irtLevel !== null && (
            <span className="st-irt-badge">🧠 IRT start: Lv {irtLevel}</span>
          )}
          {thetaInfo !== null && (
            <span className={`st-irt-badge ${irtBadgeClass}`}>
              {thetaDelta > 0.001 ? "↑ Ability improved" : thetaDelta < -0.001 ? "↓ Ability adjusted" : "= Ability stable"}
              &nbsp;({thetaInfo.new.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {/* Timeout banner */}
      {status === "timeout" && (
        <div className="st-result-banner st-result-timeout">
          <div className="st-result-banner-icon">⏰</div>
          <div>
            <h2>Time&apos;s Up on Level {resultLevel}!</h2>
            <p>
              {nextIrtLevel !== null
                ? `Algorithm adjusting → next challenge: Level ${nextIrtLevel}.`
                : "Calculating your next challenge…"}
              {thetaInfo && ` Ability: ${thetaInfo.old.toFixed(2)} → ${thetaInfo.new.toFixed(2)}`}
            </p>
          </div>
        </div>
      )}

      {/* Win banner */}
      {status === "done" && resultLevel < TOTAL_LEVELS && (
        <div className="st-result-banner st-result-win">
          <div className="st-result-banner-icon">🌟</div>
          <div>
            <h2>Level {resultLevel} Complete!</h2>
            <p>
              {nextIrtLevel !== null
                ? `Next challenge: Level ${nextIrtLevel}.`
                : "Finding your next challenge…"}
              {thetaInfo && ` Ability: ${thetaInfo.old.toFixed(2)} → ${thetaInfo.new.toFixed(2)}`}
            </p>
          </div>
        </div>
      )}

      <h1 className="st-title">Sequence the Task</h1>

      <p className="st-subtitle">
        {status === "ready"   && "Put the daily activities in the correct order!"}
        {status === "playing" && "Arrange the activities in the right sequence."}
        {(status === "done" || status === "timeout") && (status === "done" ? "Level complete! 🌟" : "Time's up! ⏰")}
      </p>

      {/* Level card + timer */}
      <div className={`st-level-card${difficultyLevel === TOTAL_LEVELS ? " st-level-complete" : ""}`}>
        <strong>Level {difficultyLevel} / {TOTAL_LEVELS}</strong>
        <span>{currentConfig.steps} activities</span>
        {status === "playing" && (
          <span>
            ⏱ <span className={`st-timer-display ${timerClass}`}>{formatTime(timeLeft)}</span>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af", marginLeft: "4px" }}>/ {formatTime(timeLimit)}</span>
          </span>
        )}
      </div>

      {/* Timer bar */}
      {status === "playing" && (
        <div className="st-timer-track" title={`${timeLeft}s remaining`}>
          <div className={`st-timer-fill ${timerClass}`} style={{ width: `${timeProgress}%` }} />
        </div>
      )}

      {/* Playing */}
      {status === "playing" && (
        <>
          <div className="st-list">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`st-step${selectedIndex === index ? " selected" : ""}${isTileCorrectPosition(step, index) ? " correct" : ""}`}
                onClick={() => handleTileTap(index)}
              >
                <div className="st-position-badge">{index + 1}</div>
                <div className="st-step-emoji">{step.emoji}</div>
                <div className="st-step-label">{step.label}</div>
                <div className="st-step-arrows">
                  <button type="button" className="st-arrow-btn" disabled={index === 0}
                    onClick={e => { e.stopPropagation(); moveStep(index, -1); }}>▲</button>
                  <button type="button" className="st-arrow-btn" disabled={index === steps.length - 1}
                    onClick={e => { e.stopPropagation(); moveStep(index, 1); }}>▼</button>
                </div>
              </div>
            ))}
          </div>

          {feedback && <p className="st-hint">{feedback}</p>}

          <button type="button" className="st-check-button" onClick={checkOrder}>
            ✓ Check Order
          </button>
        </>
      )}

      {/* Result summary */}
      {(status === "done" || status === "timeout") && (
        <div className="st-summary-card">
          <div className="st-summary-icon">{resultLevel === TOTAL_LEVELS ? "🏆" : status === "done" ? "🌟" : "⏰"}</div>
          <h2 className="st-summary-title">
            {status === "done" ? `Level ${resultLevel} Complete!` : `Level ${resultLevel} — Time's Up`}
          </h2>
          <p className="st-summary-line">Activities: {correctOrder.length}</p>
          <p className="st-summary-line">Moves used: {moveCount}</p>
          <p className="st-summary-line">Wrong checks: {wrongChecks}</p>
          {lastFiveTimes.length > 0 && (
            <p className="st-summary-line">
              Recent avg time: {Math.round(lastFiveTimes.reduce((a, b) => a + b, 0) / lastFiveTimes.length / 1000)}s
            </p>
          )}
          {resultLevel === TOTAL_LEVELS && status === "done" && (
            <div className="st-assessment-message">
              <h3>🏆 All 10 Levels Completed</h3>
              <p>The player completed the highest difficulty level. This result should be considered alongside other cognitive assessments by a qualified healthcare professional.</p>
            </div>
          )}
        </div>
      )}

      {/* Ready — Start */}
      {status === "ready" && (
        <button type="button" className="st-big-button" onClick={startGame}>
          ▶ Start Level {difficultyLevel}
        </button>
      )}

      {/* Done/Timeout buttons */}
      {(status === "done" || status === "timeout") && (
        <div className="st-btn-row">
          <button type="button" className="st-big-button" onClick={tryAgain}>
            ↻ Try Again
          </button>
          {resultLevel < TOTAL_LEVELS && (
            <button
              type="button"
              className={`st-big-button${nextIrtLevel === null ? " btn-loading" : ""}`}
              disabled={nextIrtLevel === null}
              onClick={goToNextLevel}
            >
              {nextIrtLevel === null ? "⏳ Calculating…" : `Next: Lv ${nextIrtLevel} →`}
            </button>
          )}
          {resultLevel === TOTAL_LEVELS && status === "done" && (
            <button type="button" className="st-big-button" onClick={() => {
              setDifficultyLevel(1); setCompletedLevel(null); setNextIrtLevel(null);
              setThetaInfo(null); setCorrectOrder([]); setSteps([]);
              setStatus("ready"); setTimeLeft(getTimeLimit(1));
              resultSentRef.current = false;
            }}>↻ Start Again</button>
          )}
        </div>
      )}

      {status === "ready" && (
        <p className="st-hint">Level {difficultyLevel} of {TOTAL_LEVELS} · {currentConfig.steps} random activities</p>
      )}

    </div>
  );
}
