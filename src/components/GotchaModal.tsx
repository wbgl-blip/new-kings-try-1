/* src/components/GotchaModal.tsx */

import React, { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const GotchaModal: React.FC = () => {
  const {
    players,
    myPlayerId,
    gotcha,
    phase,
    smokoUntil,
  } = useGameStore();

  const [cooldown, setCooldown] = useState(false);

  const me = players.find((p) => p.id === myPlayerId);

  /* ======================================================
     GUARDS
  ====================================================== */

  // Must be question master
  if (!me?.isQuestionMaster) return null;

  // Only during normal play
  if (phase !== "playing") return null;

  // Locked during smoko
  if (smokoUntil) return null;

  if (cooldown) return null;

  /* ======================================================
     HANDLER
  ====================================================== */

  const handleGotcha = (targetId: string) => {
    if (cooldown) return;

    setCooldown(true);

    gotcha(targetId);

    // Prevent spam
    setTimeout(() => {
      setCooldown(false);
    }, 2000);
  };

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <AnimatePresence>
      <motion.div
        key="gotcha"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-24 right-4 z-40"
      >
        <div className="bg-purple-600 rounded-xl p-3 shadow-xl space-y-2 border border-purple-400/30">

          {/* TITLE */}
          <div className="text-sm font-extrabold text-white text-center">
            ❓ GOTCHA
          </div>

          {/* SUBTEXT */}
          <div className="text-[10px] text-purple-100 text-center">
            Tap who answered you
          </div>

          {/* PLAYER GRID */}
          <div className="grid grid-cols-2 gap-2">
            {players
              .filter((p) => p.id !== myPlayerId)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleGotcha(p.id)}
                  className="
                    bg-black/40 text-white py-1 rounded-lg text-xs
                    hover:bg-purple-800
                    active:scale-[0.95]
                    transition
                  "
                >
                  {p.name}
                </button>
              ))}
          </div>

          {/* COOLDOWN FEEDBACK */}
          {cooldown && (
            <div className="text-[10px] text-center text-purple-200 pt-1">
              Applied ✔
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
