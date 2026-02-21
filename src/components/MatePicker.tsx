/* src/components/MatePicker.tsx */

import React from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const MatePicker: React.FC = () => {
  const {
    activeCard,
    myPlayerId,
    players,
    addMate,
    phase,
  } = useGameStore();

  if (phase !== "playing") return null;
  if (!activeCard || activeCard.rank !== "8") return null;

  const selectable = players.filter(p => p.id !== myPlayerId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-md bg-neutral-900 rounded-2xl p-6 space-y-6 border border-neutral-800">

          <h2 className="text-xl font-black text-green-400 text-center">
            Pick Your Mate 😈
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {selectable.map(p => (
              <button
                key={p.id}
                onClick={() => addMate(p.id)}
                className="bg-neutral-800 hover:bg-green-600 hover:text-black font-bold py-3 rounded-xl transition-all"
              >
                {p.name}
              </button>
            ))}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
