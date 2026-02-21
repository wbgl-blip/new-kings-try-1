/* src/components/SmokoModal.tsx */

import React from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const SmokoModal: React.FC = () => {
  const { phase, smokoUntil } = useGameStore();

  if (phase !== "paused" || !smokoUntil) return null;

  const remaining = Math.max(
    0,
    Math.ceil((smokoUntil - Date.now()) / 1000)
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center space-y-4"
      >
        <div className="text-4xl font-black text-yellow-400">
          🚬 SMOKO
        </div>

        <div className="text-6xl font-black text-white">
          {remaining}
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
