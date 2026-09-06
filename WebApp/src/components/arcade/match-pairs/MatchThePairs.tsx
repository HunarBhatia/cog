"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./MatchThePairs.css";
import { getRecommendedLevel, sendGameResult } from "./gameApi";
import { useAuth } from "@/components/auth/AuthContext";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Card = {
  id: number;
  pairId: number;
  icon: string;
  flipped: boolean;
  matched: boolean;
};

type GameStatus = "playing" | "won" | "timeout";

const TOTAL_LEVELS = 10;

/**
 * Time limit per level (seconds). Decreases linearly:
 * Level 1 = 120s → Level 10 = 30s (−10s per level)
 */
const LEVEL_TIME_LIMITS: Record<number, number> = {
  1: 120, 2: 110, 3: 100, 4: 90, 5: 80,
  6: 70,  7: 60,  8: 50,  9: 40, 10: 30,
};

function getTimeLimit(level: number): number {
  return LEVEL_TIME_LIMITS[level] ?? 30;
}

const PAIR_ICONS = ["🧺", "☕", "🦜", "🌺", "🎋", "🧶", "🦋", "🪘"];

function getPairsForLevel(_level: number) {
  return 8;
}

function buildDeck(level: number): Card[] {
  const pairCount = getPairsForLevel(level);
  const deck: Card[] = [];
  PAIR_ICONS.slice(0, pairCount).forEach((icon, pairId) => {
    deck.push({ id: pairId * 2,     pairId, icon, flipped: false, matched: false });
    deck.push({ id: pairId * 2 + 1, pairId, icon, flipped: false, matched: false });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchThePairs() {
  const { token } = useAuth();

  // IRT state
  const [irtLevel, setIrtLevel]       = useState<number | null>(null);
  const [nextIrtLevel, setNextIrtLevel] = useState<number | null>(null);
  const [thetaInfo, setThetaInfo]     = useState<{ old: number; new: number } | null>(null);

  // Core game state
  const [level, setLevel]               = useState(1);
  const [cards, setCards]               = useState<Card[]>(() => buildDeck(1));
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [locked, setLocked]             = useState(false);
  const [moves, setMoves]               = useState(0);
  const [gameStatus, setGameStatus]     = useState<GameStatus>("playing");

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(() => getTimeLimit(1));
  const timeLimit = getTimeLimit(level);

  const totalPairs = getPairsForLevel(level);
  const matchedPairs = useMemo(
    () => cards.filter((c) => c.matched).length / 2,
    [cards]
  );
  const progress        = (matchedPairs / totalPairs) * 100;
  const timeProgress    = (timeLeft / timeLimit) * 100;
  const secondsElapsed  = timeLimit - timeLeft;

  // Timer urgency
  const timerClass =
    timeLeft <= 15 ? "timer-urgent" :
    timeLeft <= 30 ? "timer-warning" : "";

  // Refs to capture current values for async callbacks (avoid stale closures)
  const levelRef        = useRef(level);
  const movesRef        = useRef(moves);
  const matchedRef      = useRef(matchedPairs);
  const secondsRef      = useRef(secondsElapsed);
  const resultSentRef   = useRef(false);
  const initializedRef  = useRef(false);   // prevent double IRT fetch in StrictMode

  useEffect(() => { levelRef.current   = level;         }, [level]);
  useEffect(() => { movesRef.current   = moves;         }, [moves]);
  useEffect(() => { matchedRef.current = matchedPairs;  }, [matchedPairs]);
  useEffect(() => { secondsRef.current = secondsElapsed;}, [secondsElapsed]);

  // ── Fetch IRT-recommended level (once, guarded against StrictMode double) ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    getRecommendedLevel("memory").then((recommended) => {
      setIrtLevel(recommended);
      setLevel(recommended);
      setCards(buildDeck(recommended));
      setTimeLeft(getTimeLimit(recommended));
      levelRef.current = recommended;
    });
  }, []);

  // ── Countdown timer (pure tick, no side effects inside updater) ──────────
  useEffect(() => {
    if (gameStatus !== "playing") return;
    const timer = window.setInterval(
      () => setTimeLeft((t) => (t > 0 ? t - 1 : 0)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [gameStatus]);

  // ── Timeout detection (separate effect, clean and explicit) ─────────────
  useEffect(() => {
    if (gameStatus === "playing" && timeLeft === 0) {
      setGameStatus("timeout");
    }
  }, [timeLeft, gameStatus]);

  // ── Detect win ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameStatus === "playing" && matchedPairs === totalPairs && totalPairs > 0) {
      setGameStatus("won");
    }
  }, [matchedPairs, totalPairs, gameStatus]);

  // ── Check pair match ─────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCards.length !== 2) return;

    const first  = cards.find((c) => c.id === selectedCards[0]);
    const second = cards.find((c) => c.id === selectedCards[1]);
    if (!first || !second) return;

    setLocked(true);

    const timer = window.setTimeout(() => {
      if (first.pairId === second.pairId) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === first.id || c.id === second.id
              ? { ...c, flipped: true, matched: true }
              : c
          )
        );
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === first.id || c.id === second.id
              ? { ...c, flipped: false }
              : c
          )
        );
      }
      setSelectedCards([]);
      setLocked(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [selectedCards, cards]);

  // ── Send result to IRT + Django on win or timeout ────────────────────────
  useEffect(() => {
    if (gameStatus === "playing" || resultSentRef.current) return;
    resultSentRef.current = true;

    const isWin       = gameStatus === "won";
    const irtResult   = isWin ? 1 : 0;

    /**
     * Score calculation:
     * - Win:     efficiency-based 0–100 (moves vs minimum possible moves)
     * - Timeout: partial credit = pairs matched / total pairs × 50
     *            (capped at 50 to still penalise failure; makes M meaningful
     *             so IRT theta adjusts properly, not minimally)
     */
    const pairsFound  = matchedRef.current;
    const rawScore = isWin
      ? Math.max(0, Math.round((totalPairs / Math.max(movesRef.current, totalPairs)) * 100))
      : Math.round((pairsFound / totalPairs) * 50);

    const currentLevel = levelRef.current;

    sendGameResult(
      {
        gameId: "match_the_pairs",
        playerName: "Patient",
        score: rawScore,
        completed: isWin,
        timeSeconds: secondsRef.current,
        moves: movesRef.current,
        pairsFound,
        totalPairs,
      },
      currentLevel,
      irtResult as 0 | 1,
      token
    ).then((irtResponse) => {
      // Show theta change to patient
      if (irtResponse) {
        setThetaInfo({ old: irtResponse.theta_old, new: irtResponse.theta_new });
      }
      // After theta is updated, fetch the new optimal level
      return getRecommendedLevel("memory");
    }).then((recommended) => {
      setNextIrtLevel(recommended);
    }).catch(() => {
      getRecommendedLevel("memory").then((r) => setNextIrtLevel(r));
    });

  }, [gameStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Card click ───────────────────────────────────────────────────────────
  function handleCardClick(id: number) {
    if (locked || gameStatus !== "playing") return;
    const clicked = cards.find((c) => c.id === id);
    if (!clicked || clicked.flipped || clicked.matched) return;
    if (selectedCards.length >= 2) return;

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, flipped: true } : c))
    );
    setSelectedCards((prev) => {
      const next = [...prev, id];
      if (next.length === 2) setMoves((m) => m + 1);
      return next;
    });
  }

  // ── Go to IRT-recommended next level ────────────────────────────────────
  function handleNextLevel() {
    const next = Math.max(1, Math.min(TOTAL_LEVELS, nextIrtLevel ?? level));
    setLevel(next);
    levelRef.current = next;
    setCards(buildDeck(next));
    setSelectedCards([]);
    setLocked(false);
    setTimeLeft(getTimeLimit(next));
    setMoves(0);
    setGameStatus("playing");
    setNextIrtLevel(null);
    setThetaInfo(null);
    resultSentRef.current = false;
  }

  // ── Restart same level ───────────────────────────────────────────────────
  function handleRestart() {
    setCards(buildDeck(level));
    setSelectedCards([]);
    setLocked(false);
    setTimeLeft(getTimeLimit(level));
    setMoves(0);
    setGameStatus("playing");
    setNextIrtLevel(null);
    setThetaInfo(null);
    resultSentRef.current = false;
  }

  // ── Render helpers ───────────────────────────────────────────────────────
  const thetaDelta  = thetaInfo ? (thetaInfo.new - thetaInfo.old) : 0;
  const thetaUp     = thetaDelta > 0.001;
  const thetaDown   = thetaDelta < -0.001;

  const nextLabel = nextIrtLevel === null
    ? "⏳ Calculating…"
    : gameStatus === "won"
      ? `Next: Level ${nextIrtLevel} →`
      : `Next: Level ${nextIrtLevel} →`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="game-bg">
      <div className="game-shell">

        {/* ── Back + IRT badge ──────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href="/arcade"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem", background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: "0.75rem", fontSize: "0.82rem", fontWeight: 700,
              color: "#374151", textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,.06)",
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14, color: "#059669" }} />
            Back to Arcade
          </Link>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {irtLevel !== null && (
              <span className="irt-badge">
                🧠 IRT start: Lv {irtLevel}
              </span>
            )}
            {/* Live theta indicator */}
            {thetaInfo !== null && (
              <span className={`irt-badge ${thetaUp ? "theta-up" : thetaDown ? "theta-down" : ""}`}>
                {thetaUp   ? "↑" : thetaDown ? "↓" : "="}&nbsp;
                Ability {thetaUp ? "improved" : thetaDown ? "adjusted" : "stable"}
                &nbsp;({thetaInfo.new.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* ── TIMEOUT BANNER ────────────────────────────────────────── */}
        {gameStatus === "timeout" && (
          <div className="result-banner result-timeout">
            <div className="result-banner-icon">⏰</div>
            <div>
              <h2>Time&apos;s Up on Level {level}!</h2>
              <p>
                You matched {matchedPairs} of {totalPairs} pairs.&nbsp;
                {thetaInfo
                  ? `Ability score: ${thetaInfo.old.toFixed(2)} → ${thetaInfo.new.toFixed(2)}.`
                  : "Calculating your ability score…"}
                &nbsp;
                {nextIrtLevel !== null
                  ? `Next challenge: Level ${nextIrtLevel}.`
                  : "Finding your next challenge…"}
              </p>
            </div>
          </div>
        )}

        {/* ── WIN BANNER (final level) ───────────────────────────────── */}
        {gameStatus === "won" && level === TOTAL_LEVELS && (
          <div className="assessment-message">
            <h2>Highest Level Completed 🎉</h2>
            <p>You completed all 10 levels. This result may be useful for cognitive assessment by a healthcare professional.</p>
          </div>
        )}

        {/* ── WIN BANNER (mid levels) ───────────────────────────────── */}
        {gameStatus === "won" && level < TOTAL_LEVELS && (
          <div className="result-banner result-win">
            <div className="result-banner-icon">🌟</div>
            <div>
              <h2>Level {level} Complete!</h2>
              <p>
                Finished in {formatTime(secondsElapsed)} with {moves} moves.&nbsp;
                {thetaInfo
                  ? `Ability score: ${thetaInfo.old.toFixed(2)} → ${thetaInfo.new.toFixed(2)}.`
                  : "Updating ability score…"}
                &nbsp;
                {nextIrtLevel !== null
                  ? `Next challenge: Level ${nextIrtLevel}.`
                  : "Finding your next challenge…"}
              </p>
            </div>
          </div>
        )}

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="game-header">

          <div className="patient-card">
            <div className="patient-avatar">👴</div>
            <div>
              <p className="patient-hello">Hello, Patient</p>
              <p className="patient-note">
                {gameStatus === "won"     ? "Wonderful! 🎉" :
                 gameStatus === "timeout" ? "Keep trying! 💪" :
                 "You're doing great!"}
              </p>
            </div>
          </div>

          <div className="wooden-sign">
            <span className="sign-rope sign-rope-left" />
            <span className="sign-rope sign-rope-right" />
            <h1>🧩 MATCH THE PAIRS</h1>
            <p>Find all the matching pictures</p>
          </div>

          <div className="level-card">
            <p className="level-title">Level {level} / {TOTAL_LEVELS}</p>

            {/* Countdown */}
            <div className={`level-stat timer-stat ${timerClass}`}>
              <span className="stat-icon">⏱</span>
              <div>
                <span className="stat-label">Time Left</span>
                <strong className="timer-display">{formatTime(timeLeft)}</strong>
              </div>
            </div>

            <div className="time-limit-badge">Limit: {formatTime(timeLimit)}</div>

            <div className="level-stat">
              <span className="stat-icon">🃏</span>
              <div>
                <span className="stat-label">Pairs</span>
                <strong>{matchedPairs}/{totalPairs}</strong>
              </div>
            </div>
          </div>

        </header>

        {/* ── Timer bar ─────────────────────────────────────────────── */}
        <div className="timer-track" aria-label="Time remaining" title={`${timeLeft}s remaining`}>
          <div
            className={`timer-fill ${timerClass}`}
            style={{ width: `${timeProgress}%` }}
          />
        </div>

        {/* ── Board ─────────────────────────────────────────────────── */}
        <main
          className={`board ${gameStatus !== "playing" ? "board-disabled" : ""}`}
          aria-label="Memory matching game"
        >
          {cards.map((card) => {
            const isVisible = card.flipped || card.matched;
            const isFailed  = gameStatus === "timeout" && !card.matched;
            return (
              <button
                key={card.id}
                type="button"
                className={[
                  "mem-card",
                  isVisible ? "is-flipped"       : "",
                  card.matched ? "is-matched"    : "",
                  isFailed && isVisible ? "is-revealed-fail" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => handleCardClick(card.id)}
                disabled={card.matched || locked || gameStatus !== "playing"}
                aria-label={isVisible ? `Picture ${card.icon}` : "Hidden picture"}
              >
                <div className="mem-card-inner">
                  <div className="mem-card-back" aria-hidden="true">
                    <span className="back-leaf">🌿</span>
                  </div>
                  <div className="mem-card-front">
                    <span className="card-picture">{card.icon}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </main>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="game-footer">

          <div className="hint-bar">
            <div>
              <p className="hint-title">
                {gameStatus === "won"     ? "Great job! 🎉" :
                 gameStatus === "timeout" ? "Time's up! ⏰" :
                 "Look Carefully"}
              </p>
              <p className="hint-sub">
                {gameStatus === "won"
                  ? `${formatTime(secondsElapsed)} · ${moves} moves`
                  : gameStatus === "timeout"
                  ? `${matchedPairs}/${totalPairs} pairs found — algorithm will adjust`
                  : "Same pictures go together!"}
              </p>
            </div>
            <div className="hint-count">{matchedPairs}/{totalPairs} pairs</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="footer-btn-row">
            <button type="button" className="restart-btn" onClick={handleRestart}>
              ↻ {gameStatus === "playing" ? "Restart" : "Try Again"}
            </button>

            {gameStatus !== "playing" && (
              <button
                type="button"
                className={`restart-btn next-level-btn ${nextIrtLevel === null ? "btn-loading" : ""}`}
                onClick={handleNextLevel}
                disabled={nextIrtLevel === null}
                title={nextIrtLevel !== null
                  ? `IRT algorithm recommends Level ${nextIrtLevel}`
                  : "Calculating optimal next level…"}
              >
                {nextLabel}
              </button>
            )}
          </div>

        </footer>

      </div>
    </div>
  );
}
