"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./TapTheTarget.css";
import { getRecommendedLevel, sendGameResult } from "./gameApi";
import { useAuth } from "@/components/auth/AuthContext";

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const TOTAL_LEVELS = 10;
const ROUNDS_PER_LEVEL = 8;

const SHAPES = ["circle", "square", "triangle", "star"] as const;
const COLORS = ["#E53935", "#43A047", "#1E88E5", "#FDD835"];

const MIN_DISTRACTORS = 3;
const MAX_DISTRACTORS = 8;
const TILE_SIZE = 75;

/**
 * Perfectly synced level and per-round configuration:
 * Each round budget multiplied by 8 rounds equals the total level time.
 * Level 1: 8.0s per round (64s total) — calm, gentle pace for cognitive care.
 * Level 10: 3.5s per round (28s total) — fast, high attention challenge.
 */
const LEVEL_CONFIG: Record<number, { totalTime: number; roundTimeMs: number }> = {
  1:  { totalTime: 64, roundTimeMs: 8000 },
  2:  { totalTime: 60, roundTimeMs: 7500 },
  3:  { totalTime: 56, roundTimeMs: 7000 },
  4:  { totalTime: 52, roundTimeMs: 6500 },
  5:  { totalTime: 48, roundTimeMs: 6000 },
  6:  { totalTime: 44, roundTimeMs: 5500 },
  7:  { totalTime: 40, roundTimeMs: 5000 },
  8:  { totalTime: 36, roundTimeMs: 4500 },
  9:  { totalTime: 32, roundTimeMs: 4000 },
  10: { totalTime: 28, roundTimeMs: 3500 },
};

function getLevelConfig(level: number) {
  return LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

type Shape = (typeof SHAPES)[number];

type Tile = {
  id: number;
  shape: Shape;
  color: string;
  isTarget: boolean;
};

type RoundData = {
  tiles: Tile[];
  targetShape: Shape;
  targetColor: string;
};

type Status = "ready" | "playing" | "done" | "timeout";

type RoundOutcome = "correct" | "wrong" | "miss" | null;

function randomItem<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getDistractors(level: number): number {
  return Math.min(
    MAX_DISTRACTORS,
    MIN_DISTRACTORS +
      Math.floor(((level - 1) / (TOTAL_LEVELS - 1)) * (MAX_DISTRACTORS - MIN_DISTRACTORS))
  );
}

function createRound(distractors: number): RoundData {
  const targetShape = randomItem(SHAPES);
  const targetColor = randomItem(COLORS);
  const totalTiles = distractors + 1;
  const targetIndex = Math.floor(Math.random() * totalTiles);
  const tiles: Tile[] = [];

  for (let i = 0; i < totalTiles; i++) {
    if (i === targetIndex) {
      tiles.push({
        id: i,
        shape: targetShape,
        color: targetColor,
        isTarget: true,
      });
    } else {
      let shape: Shape;
      let color: string;
      do {
        shape = randomItem(SHAPES);
        color = randomItem(COLORS);
      } while (shape === targetShape && color === targetColor);

      tiles.push({
        id: i,
        shape,
        color,
        isTarget: false,
      });
    }
  }

  return {
    tiles,
    targetShape,
    targetColor,
  };
}

function ShapeIcon({
  shape,
  color,
  size,
}: {
  shape: Shape;
  color: string;
  size: number;
}) {
  if (shape === "circle") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="43" fill={color} />
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="8" y="8" width="84" height="84" rx="10" fill={color} />
      </svg>
    );
  }
  if (shape === "triangle") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <polygon points="50,7 94,91 6,91" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon
        points="50,5 61,37 96,37 68,58 79,92 50,71 21,92 32,58 4,37 39,37"
        fill={color}
      />
    </svg>
  );
}

function getCognitiveStatus(level: number) {
  if (level === TOTAL_LEVELS) {
    return {
      title: "Highest Level Completed 🎉",
      message:
        "You completed all 10 levels. This game result may be useful for further cognitive assessment by a healthcare professional.",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TapTheTarget() {
  const { token } = useAuth();

  // IRT state
  const [irtLevel, setIrtLevel] = useState<number | null>(null);
  const [nextIrtLevel, setNextIrtLevel] = useState<number | null>(null);
  const [thetaInfo, setThetaInfo] = useState<{ old: number; new: number } | null>(null);

  // Game state
  const [level, setLevel] = useState(1);
  const [completedLevel, setCompletedLevel] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [round, setRound] = useState(0);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lastReaction, setLastReaction] = useState<number | null>(null);

  // Synchronized timers
  const levelCfg = getLevelConfig(level);
  const [timeLeft, setTimeLeft] = useState(() => levelCfg.totalTime);
  const [roundMsRemaining, setRoundMsRemaining] = useState(() => levelCfg.roundTimeMs);

  // Visual feedback states
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<RoundOutcome>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const difficulty = getDistractors(level);
  const timeLimit = levelCfg.totalTime;

  // Refs for stale closures
  const roundStartTimeRef = useRef<number | null>(null);
  const levelStartTimeRef = useRef<number | null>(null);
  const roundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResolvingRef = useRef(false);
  const resultSentRef = useRef(false);
  const initializedRef = useRef(false);
  const reactionTimesRef = useRef<number[]>([]);
  const wrongTapsRef = useRef(0);
  const missesRef = useRef(0);
  const currentRoundRef = useRef(0);
  const levelRef = useRef(1);

  useEffect(() => { reactionTimesRef.current = reactionTimes; }, [reactionTimes]);
  useEffect(() => { wrongTapsRef.current = wrongTaps; }, [wrongTaps]);
  useEffect(() => { missesRef.current = misses; }, [misses]);
  useEffect(() => { currentRoundRef.current = round; }, [round]);
  useEffect(() => { levelRef.current = level; }, [level]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  // Timer urgency
  const timerClass = timeLeft <= 8 ? "timer-urgent" : timeLeft <= 15 ? "timer-warning" : "";
  const timeProgress = (timeLeft / timeLimit) * 100;
  const roundProgress = (roundMsRemaining / levelCfg.roundTimeMs) * 100;
  const thetaDelta = thetaInfo ? thetaInfo.new - thetaInfo.old : 0;
  const irtBadgeClass = thetaDelta > 0.001 ? "theta-up" : thetaDelta < -0.001 ? "theta-down" : "";

  // ── IRT: fetch recommended level once on mount ──────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    getRecommendedLevel("attention").then((recommended) => {
      setIrtLevel(recommended);
      setLevel(recommended);
      const cfg = getLevelConfig(recommended);
      setTimeLeft(cfg.totalTime);
      setRoundMsRemaining(cfg.roundTimeMs);
    });
  }, []);

  // ── Overall Level Countdown Timer (ticks every 1s) ────────────────────────
  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // ── Overall Timeout Detection ────────────────────────────────────────────
  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      finishSession(false);
    }
  }, [timeLeft, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start a round (synchronized with level config) ────────────────────────
  function startRound(nextRound: number, targetLevel: number = level) {
    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    isResolvingRef.current = false;
    setSelectedTileId(null);
    setSelectedOutcome(null);
    setFeedbackText("");

    const targetCfg = getLevelConfig(targetLevel);
    const distCount = getDistractors(targetLevel);
    const data = createRound(distCount);

    setRoundData(data);
    setRound(nextRound);
    setRoundMsRemaining(targetCfg.roundTimeMs);

    const now = Date.now();
    roundStartTimeRef.current = now;

    // Sub-second countdown for the synchronized round progress bar
    const intervalTickMs = 50;
    roundIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - now;
      const remaining = Math.max(0, targetCfg.roundTimeMs - elapsed);
      setRoundMsRemaining(remaining);

      if (remaining <= 0) {
        if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
        handleRoundTimeout(nextRound, targetLevel);
      }
    }, intervalTickMs);
  }

  // ── Handle round timeout (user took longer than round budget) ──────────────
  function handleRoundTimeout(timedOutRound: number, targetLevel: number) {
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;

    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);

    const newMisses = missesRef.current + 1;
    setMisses(newMisses);
    setSelectedOutcome("miss");
    setFeedbackText("⌛ Round time up!");

    transitionTimeoutRef.current = setTimeout(() => {
      if (timedOutRound >= ROUNDS_PER_LEVEL) {
        // Finished all rounds; check if overall performance passed
        const finalCorrect = ROUNDS_PER_LEVEL - newMisses;
        finishSession(finalCorrect >= 4);
      } else {
        startRound(timedOutRound + 1, targetLevel);
      }
    }, 500);
  }

  // ── Start Level Game ─────────────────────────────────────────────────────
  function startGame() {
    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const cfg = getLevelConfig(level);
    setStatus("playing");
    setRound(0);
    setReactionTimes([]);
    setWrongTaps(0);
    setMisses(0);
    setLastReaction(null);
    setRoundData(null);
    setCompletedLevel(null);
    setNextIrtLevel(null);
    setThetaInfo(null);
    setSelectedTileId(null);
    setSelectedOutcome(null);
    setFeedbackText("");
    resultSentRef.current = false;

    const now = Date.now();
    levelStartTimeRef.current = now;
    setTimeLeft(cfg.totalTime);
    setRoundMsRemaining(cfg.roundTimeMs);
    startRound(1, level);
  }

  // ── Try Again (Same level) ───────────────────────────────────────────────
  function handleTryAgain() {
    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const retryLevel = completedLevel ?? level;
    const cfg = getLevelConfig(retryLevel);
    setLevel(retryLevel);
    setStatus("playing");
    setRound(0);
    setReactionTimes([]);
    setWrongTaps(0);
    setMisses(0);
    setLastReaction(null);
    setRoundData(null);
    setNextIrtLevel(null);
    setThetaInfo(null);
    setSelectedTileId(null);
    setSelectedOutcome(null);
    setFeedbackText("");
    resultSentRef.current = false;

    const now = Date.now();
    levelStartTimeRef.current = now;
    setTimeLeft(cfg.totalTime);
    setRoundMsRemaining(cfg.roundTimeMs);
    startRound(1, retryLevel);
  }

  // ── Next Level ───────────────────────────────────────────────────────────
  function handleNextLevel() {
    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const targetNext = Math.max(
      1,
      Math.min(TOTAL_LEVELS, nextIrtLevel ?? Math.min(TOTAL_LEVELS, level + 1))
    );
    const cfg = getLevelConfig(targetNext);

    setLevel(targetNext);
    setCompletedLevel(null);
    setStatus("ready");
    setRound(0);
    setReactionTimes([]);
    setWrongTaps(0);
    setMisses(0);
    setLastReaction(null);
    setRoundData(null);
    setNextIrtLevel(null);
    setThetaInfo(null);
    setSelectedTileId(null);
    setSelectedOutcome(null);
    setFeedbackText("");
    setTimeLeft(cfg.totalTime);
    setRoundMsRemaining(cfg.roundTimeMs);
    resultSentRef.current = false;
  }

  // ── Start Again After Level 10 ───────────────────────────────────────────
  function handleStartAgain() {
    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const cfg = getLevelConfig(1);
    setLevel(1);
    setCompletedLevel(null);
    setStatus("ready");
    setRound(0);
    setReactionTimes([]);
    setWrongTaps(0);
    setMisses(0);
    setLastReaction(null);
    setRoundData(null);
    setNextIrtLevel(null);
    setThetaInfo(null);
    setSelectedTileId(null);
    setSelectedOutcome(null);
    setFeedbackText("");
    setTimeLeft(cfg.totalTime);
    setRoundMsRemaining(cfg.roundTimeMs);
    resultSentRef.current = false;
  }

  // ── Tile Click Handler ───────────────────────────────────────────────────
  function handleTileClick(tile: Tile) {
    if (status !== "playing" || !roundData || roundStartTimeRef.current === null) return;
    if (isResolvingRef.current) return; // Prevent double taps during transition
    isResolvingRef.current = true;

    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);

    const reaction = Date.now() - roundStartTimeRef.current;
    setSelectedTileId(tile.id);

    if (!tile.isTarget) {
      // Wrong tile tapped
      const newWrongTaps = wrongTaps + 1;
      setWrongTaps(newWrongTaps);
      setSelectedOutcome("wrong");
      setFeedbackText("❌ Not the target shape");

      transitionTimeoutRef.current = setTimeout(() => {
        if (round >= ROUNDS_PER_LEVEL) {
          const finalCorrect = ROUNDS_PER_LEVEL - missesRef.current;
          finishSession(finalCorrect >= 4);
        } else {
          startRound(round + 1, level);
        }
      }, 450);
      return;
    }

    // Correct tile tapped
    const newTimes = [...reactionTimes, reaction];
    setLastReaction(reaction);
    setReactionTimes(newTimes);
    setSelectedOutcome("correct");
    setFeedbackText(`✨ Match found! (${reaction} ms)`);

    transitionTimeoutRef.current = setTimeout(() => {
      if (round >= ROUNDS_PER_LEVEL) {
        const finalCorrect = ROUNDS_PER_LEVEL - missesRef.current;
        finishSession(finalCorrect >= 4);
      } else {
        startRound(round + 1, level);
      }
    }, 450);
  }

  // ── Finish Session (Win or Timeout) ──────────────────────────────────────
  function finishSession(success: boolean) {
    if (roundIntervalRef.current) clearInterval(roundIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setRoundData(null);
    if (resultSentRef.current) return;
    resultSentRef.current = true;

    const currentLevel = levelRef.current;
    const finalTimes = reactionTimesRef.current;
    const finalMisses = missesRef.current;
    const finalWrong = wrongTapsRef.current;
    const timeTakenMs = levelStartTimeRef.current ? Date.now() - levelStartTimeRef.current : 0;

    setCompletedLevel(currentLevel);
    setStatus(success ? "done" : "timeout");

    const average =
      finalTimes.length > 0
        ? Math.round(finalTimes.reduce((sum, t) => sum + t, 0) / finalTimes.length)
        : 0;

    const accuracy = Math.max(
      0,
      Math.round(((ROUNDS_PER_LEVEL - finalMisses) / ROUNDS_PER_LEVEL) * 100)
    );

    const score = success
      ? Math.max(15, Math.min(100, Math.round(accuracy - finalWrong * 5)))
      : Math.round(accuracy / 2);

    sendGameResult(
      {
        gameId: "tap_the_target",
        playerName: "Patient",
        score,
        completed: success,
        timeSeconds: Math.round(timeTakenMs / 1000),
        accuracy,
        wrongTaps: finalWrong,
        misses: finalMisses,
        averageReactionTime: average,
        rounds: ROUNDS_PER_LEVEL,
      },
      currentLevel,
      success ? 1 : 0,
      token,
      "attention"
    )
      .then((irtResponse) => {
        if (irtResponse) {
          setThetaInfo({ old: irtResponse.theta_old, new: irtResponse.theta_new });
        }
        return getRecommendedLevel("attention");
      })
      .then(setNextIrtLevel)
      .catch(() => getRecommendedLevel("attention").then(setNextIrtLevel));
  }

  const averageReaction =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((sum, v) => sum + v, 0) / reactionTimes.length)
      : null;

  const accuracy = Math.max(
    0,
    Math.round(((ROUNDS_PER_LEVEL - misses) / ROUNDS_PER_LEVEL) * 100)
  );

  const resultLevel = completedLevel ?? level;
  const cognitiveStatus = status === "done" ? getCognitiveStatus(resultLevel) : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="target-game">
      <div className="target-container">

        {/* Back row + IRT badge */}
        <div className="target-back-row">
          <Link href="/arcade" className="target-back-link">
            <ArrowLeft style={{ width: 14, height: 14, color: "#2e7d32" }} />
            Back to Arcade
          </Link>

          <div className={`target-irt-badge ${irtBadgeClass}`}>
            <span>IRT Domain: <strong>attention</strong></span>
            {thetaInfo && (
              <span style={{ marginLeft: 4 }}>
                (θ {thetaInfo.old.toFixed(2)} → {thetaInfo.new.toFixed(2)}
                {thetaDelta > 0.001 ? " ▲" : thetaDelta < -0.001 ? " ▼" : " ▬"})
              </span>
            )}
            {irtLevel && !thetaInfo && (
              <span style={{ marginLeft: 4, opacity: 0.75 }}>
                (Rec. L{irtLevel})
              </span>
            )}
          </div>
        </div>

        {/* Patient Greeting */}
        <div className="patient-message">
          <span>😊</span>
          <strong>Hello, Patient!</strong>
          <span>You&apos;re doing great!</span>
        </div>

        {/* Game Title Sign */}
        <div className="game-sign">
          <div className="sign-title">🎯 TAP THE TARGET</div>
          <div className="sign-subtitle">Find the matching shape before the timer runs out!</div>
        </div>

        {/* Level & Total Timer Card */}
        <div className="target-level-card">
          <strong>
            Level {level} / {TOTAL_LEVELS}
          </strong>

          <div
            className={`target-timer-display ${timerClass}`}
            aria-label={`Time remaining: ${formatTime(timeLeft)}`}
          >
            ⏱️ {formatTime(timeLeft)}
          </div>

          <span>{difficulty + 1} options</span>
        </div>

        {/* Total Level Countdown Progress Bar */}
        <div className="target-timer-track">
          <div
            className={`target-timer-fill ${timerClass}`}
            style={{ width: `${Math.max(0, Math.min(100, timeProgress))}%` }}
          />
        </div>

        {/* Status Banners */}
        {status === "timeout" && (
          <div className="target-result-banner target-result-timeout">
            <span className="target-result-banner-icon">⏰</span>
            <div>
              <h2>Time&apos;s Up for Level {resultLevel}!</h2>
              <p>
                Don&apos;t worry — the algorithm adapted your level so you can try again at the right pace.
                {nextIrtLevel && ` Recommended next: Level ${nextIrtLevel}.`}
              </p>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="target-result-banner target-result-win">
            <span className="target-result-banner-icon">🌟</span>
            <div>
              <h2>Level {resultLevel} Passed!</h2>
              <p>
                Great focus!
                {nextIrtLevel && nextIrtLevel !== resultLevel
                  ? ` Adaptive algorithm shifted your target to Level ${nextIrtLevel}.`
                  : " Keep going to continue challenging your attention."}
              </p>
            </div>
          </div>
        )}

        {/* Ready Screen */}
        {status === "ready" && (
          <div className="instruction-card">
            <div className="instruction-icon">🎯</div>
            <h2>Ready to Play?</h2>
            <p>
              Look at the target shape and color at the top, then tap the identical shape in the grid
              before time runs out! You have {ROUNDS_PER_LEVEL} rounds to complete in {levelCfg.totalTime} seconds.
            </p>
          </div>
        )}

        {/* Playing Screen */}
        {status === "playing" && roundData && (
          <>
            {/* Target Preview */}
            <div className="target-preview">
              <span>Target</span>
              <ShapeIcon
                shape={roundData.targetShape}
                color={roundData.targetColor}
                size={75}
              />
            </div>

            <div className="match-text">Which one matches?</div>

            {/* Synchronized Round Timer Track */}
            <div className="target-round-timer-wrap">
              <span>Round {round} Time:</span>
              <div className="target-round-timer-track">
                <div
                  className={`target-round-timer-fill ${roundProgress < 25 ? "round-urgent" : ""}`}
                  style={{ width: `${Math.max(0, Math.min(100, roundProgress))}%` }}
                />
              </div>
              <span>{(roundMsRemaining / 1000).toFixed(1)}s</span>
            </div>

            {/* Options Grid */}
            <div className="target-grid">
              {roundData.tiles.map((tile) => {
                const isSelected = selectedTileId === tile.id;
                let tileClass = "target-tile";
                if (isSelected) {
                  if (selectedOutcome === "correct") tileClass += " tile-correct";
                  if (selectedOutcome === "wrong") tileClass += " tile-wrong";
                }

                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={tileClass}
                    onClick={() => handleTileClick(tile)}
                    aria-label={`Shape ${tile.shape}`}
                    disabled={isResolvingRef.current}
                  >
                    <ShapeIcon shape={tile.shape} color={tile.color} size={TILE_SIZE} />
                  </button>
                );
              })}
            </div>

            {/* Feedback message */}
            <div
              className={`target-round-feedback ${
                selectedOutcome === "correct"
                  ? "feedback-correct"
                  : selectedOutcome === "wrong"
                  ? "feedback-wrong"
                  : selectedOutcome === "miss"
                  ? "feedback-timeout"
                  : ""
              }`}
            >
              {feedbackText}
            </div>

            {/* Progress area */}
            <div className="progress-area">
              <div className="progress-dots">
                {Array.from({ length: ROUNDS_PER_LEVEL }).map((_, index) => (
                  <span
                    key={index}
                    className={index < round ? "dot active" : "dot"}
                  />
                ))}
              </div>
              <div className="round-info">
                Round {round} / {ROUNDS_PER_LEVEL}
              </div>
            </div>

            {lastReaction !== null && (
              <div className="reaction">⚡ Last reaction: {lastReaction} ms</div>
            )}
          </>
        )}

        {/* Result Screen (done or timeout) */}
        {(status === "done" || status === "timeout") && (
          <div className="result-card">
            <div className="result-icon">
              {status === "timeout" ? "⏳" : resultLevel === TOTAL_LEVELS ? "🏆" : "🎉"}
            </div>
            <h2>
              Level {resultLevel} {status === "timeout" ? "Incomplete" : "Complete!"}
            </h2>
            <p>
              Accuracy: <strong>{accuracy}%</strong>
            </p>
            <p>
              Wrong taps: <strong>{wrongTaps}</strong>
            </p>
            <p>
              Missed: <strong>{misses}</strong>
            </p>
            {averageReaction !== null && (
              <p>
                Average reaction: <strong>{averageReaction} ms</strong>
              </p>
            )}

            {cognitiveStatus && (
              <div className="assessment-message">
                <h3>{cognitiveStatus.title}</h3>
                <p>{cognitiveStatus.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {status === "ready" && (
          <button
            type="button"
            className="start-target-button"
            onClick={startGame}
          >
            ▶ Start Level {level}
          </button>
        )}

        {status === "timeout" && (
          <div className="result-buttons">
            <button
              type="button"
              className="start-target-button"
              onClick={handleTryAgain}
            >
              ↻ Try Level Again
            </button>
            {nextIrtLevel && nextIrtLevel !== level && (
              <button
                type="button"
                className="start-target-button"
                onClick={handleNextLevel}
              >
                Adaptive Level {nextIrtLevel} →
              </button>
            )}
          </div>
        )}

        {status === "done" && resultLevel < TOTAL_LEVELS && (
          <div className="result-buttons">
            <button
              type="button"
              className="start-target-button"
              onClick={handleTryAgain}
            >
              ↻ Try Again
            </button>
            <button
              type="button"
              className="start-target-button"
              onClick={handleNextLevel}
            >
              Next Level (L{nextIrtLevel ?? Math.min(TOTAL_LEVELS, level + 1)}) →
            </button>
          </div>
        )}

        {status === "done" && resultLevel === TOTAL_LEVELS && (
          <button
            type="button"
            className="start-target-button"
            onClick={handleStartAgain}
          >
            ↻ Start Again
          </button>
        )}

      </div>
    </div>
  );
}
