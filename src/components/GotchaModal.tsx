/* src/components/GotchaModal.tsx */

import React from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

export const GotchaModal: React.FC = () => {
  const {
    players,
    myPlayerId,
    gotcha,
  } = useGameStore();

  const me = players.find(p => p.id === myPlayerId);

  if (!me?.isQuestionMaster) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-24 right-4 z-40"
      >
        <div className="bg-purple-600 rounded-xl p-3 shadow-xl space-y-2">

          <div className="text-sm font-bold text-white text-center">
            ❓ GOTCHA
          </div>

          <div className="grid grid-cols-2 gap-2">
            {players
              .filter(p => p.id !== myPlayerId)
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => gotcha(p.id)}
                  className="bg-black/40 text-white py-1 rounded-lg text-xs"
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
