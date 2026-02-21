/* src/components/MatePicker.tsx */

import React, { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const MatePicker: React.FC = () => {
  const {
    activeCard,
    myPlayerId,
    players,
    addMate,
    phase,
    currentPlayerIndex,
    smokoUntil,
  } = useGameStore();

  const [picked, setPicked] = useState(false);

  /* ======================================================
     GUARDS
  ====================================================== */

  // Only during active play
  if (phase !== "playing") return null;

  // Only when an 8 is active
  if (!activeCard || activeCard.rank !== "8") return null;

  // Pause / reaction / turngame lock
  if (smokoUntil) return null;

  const currentPlayer = players[currentPlayerIndex];

  // Only drawer can pick
  if (!currentPlayer || currentPlayer.id !== myPlayerId) {
    return null;
  }

  // Prevent double picking
  if (picked) return null;

  const me = players.find((p) => p.id === myPlayerId);
  if (!me) return null;

  const existingMates = me.mateIds ?? [];

  // Exclude self + existing mates
  const selectable = players.filter(
    (p) => p.id !== myPlayerId && !existingMates.includes(p.id)
  );

  if (selectable.length === 0) return null;

  /* ======================================================
     HANDLERS
  ====================================================== */

  const handlePick = (targetId: string) => {
    if (picked) return;

    setPicked(true);
    addMate(targetId);
  };

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <AnimatePresence>
      <motion.div
        key="mate-picker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-neutral-900 rounded-2xl p-6 space-y-6 border border-neutral-800"
        >
          {/* TITLE */}
          <h2 className="text-xl font-black text-green-400 text-center">
            Pick Your Mate 😈
          </h2>

          {/* SUBTEXT */}
          <p className="text-center text-xs text-neutral-400">
            Your mate drinks whenever you drink.
          </p>

          {/* PLAYER GRID */}
          <div className="grid grid-cols-2 gap-3">
            {selectable.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePick(p.id)}
                disabled={picked}
                className={`
                  font-bold py-3 rounded-xl transition-all
                  ${
                    picked
                      ? "bg-neutral-700 text-neutral-400"
                      : "bg-neutral-800 hover:bg-green-600 hover:text-black active:scale-[0.97]"
                  }
                `}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* CONFIRM */}
          {picked && (
            <div className="text-center text-xs text-green-400 font-bold pt-2">
              Mate locked in ✔
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
