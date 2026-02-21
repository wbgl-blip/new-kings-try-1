/* src/components/TurnGameOverlay.tsx */

import React, { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const TurnGameOverlay: React.FC = () => {
  const {
    turnGame,
    players,
    currentPlayerIndex,
    phase,
  } = useGameStore();

  if (!turnGame.active || phase !== "turngame") return null;

  const current = players[currentPlayerIndex];

  const remaining = Math.max(
    0,
    Math.ceil((turnGame.deadline - Date.now()) / 1000)
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center space-y-6"
      >
        <h2 className="text-3xl font-black text-yellow-400">
          {turnGame.mode === "rhyme" ? "RHYME ROUND" : "CATEGORY ROUND"}
        </h2>

        <div className="text-xl font-bold">
          {current?.name}
        </div>

        <div className="text-5xl font-black text-red-500">
          {remaining}
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
