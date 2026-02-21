/* src/components/TurnGameOverlay.tsx */

import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const TurnGameOverlay: React.FC = () => {
  const {
    turnGame,
    players,
    currentPlayerIndex,
    phase,
    isHost,
    smokoUntil,
    gotcha,
    receiveState,
  } = useGameStore();

  const [now, setNow] = useState(Date.now());

  /* ======================================================
     LIVE TIMER
  ====================================================== */

  useEffect(() => {
    if (phase !== "turngame") return;

    const i = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(i);
  }, [phase]);

  /* ======================================================
     HOST TIMEOUT HANDLER
  ====================================================== */

  useEffect(() => {
    if (!isHost) return;
    if (phase !== "turngame") return;
    if (smokoUntil) return;

    if (!turnGame.active) return;

    const timeLeft = turnGame.deadline - Date.now();

    if (timeLeft > 0) return;

    // Player failed → drink
    const loser = players[currentPlayerIndex];

    if (!loser) return;

    // Apply drink via gotcha (respects mate chain)
    gotcha(loser.id);

    // Advance turn + exit mode
    const nextIndex =
      (currentPlayerIndex + 1) % players.length;

    const patch = {
      phase: "playing" as const,
      turnGame: {
        active: false,
        mode: "rhyme",
        prompt: "",
        currentIndex: nextIndex,
        deadline: 0,
      },
      currentPlayerIndex: nextIndex,
    };

    receiveState(patch);

  }, [
    phase,
    turnGame,
    isHost,
    smokoUntil,
    players,
    currentPlayerIndex,
    gotcha,
    receiveState,
  ]);

  /* ======================================================
     GUARDS
  ====================================================== */

  if (phase !== "turngame") return null;
  if (!turnGame.active) return null;
  if (smokoUntil) return null;

  const current = players[currentPlayerIndex];

  if (!current) return null;

  /* ======================================================
     TIME
  ====================================================== */

  const remaining = Math.max(
    0,
    Math.ceil((turnGame.deadline - now) / 1000)
  );

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <AnimatePresence>
      <motion.div
        key="turn-game"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center space-y-6 text-center p-4"
      >
        {/* MODE */}
        <h2 className="text-3xl font-black text-yellow-400 tracking-tight">
          {turnGame.mode === "rhyme"
            ? "🎤 RHYME ROUND"
            : "📚 CATEGORY ROUND"}
        </h2>

        {/* PLAYER */}
        <div className="text-2xl font-bold text-white">
          {current.name}
        </div>

        {/* COUNTDOWN */}
        <div
          className={`
            text-6xl font-black
            ${
              remaining <= 2
                ? "text-red-500 animate-pulse"
                : "text-yellow-400"
            }
          `}
        >
          {remaining}
        </div>

        {/* INFO */}
        <div className="text-xs text-neutral-400 max-w-xs">
          Miss it → you drink. Mates drink with you.
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
