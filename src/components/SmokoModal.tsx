/* src/components/SmokoModal.tsx */

import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { Cigarette } from "lucide-react";

export const SmokoModal: React.FC = () => {
  const {
    phase,
    smokoUntil,
    smokoCallerId,
    players,
  } = useGameStore();

  const [now, setNow] = useState(Date.now());

  /* ======================================================
     LIVE TIMER
  ====================================================== */

  useEffect(() => {
    if (phase !== "paused") return;

    const i = setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => clearInterval(i);
  }, [phase]);

  /* ======================================================
     GUARDS
  ====================================================== */

  if (phase !== "paused") return null;
  if (!smokoUntil) return null;

  /* ======================================================
     TIME
  ====================================================== */

  const remaining = Math.max(
    0,
    Math.ceil((smokoUntil - now) / 1000)
  );

  const caller = players.find(
    (p) => p.id === smokoCallerId
  );

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <AnimatePresence>
      <motion.div
        key="smoko"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center space-y-6 text-center p-4"
      >
        {/* ICON */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          className="text-yellow-400"
        >
          <Cigarette size={64} />
        </motion.div>

        {/* TITLE */}
        <div className="text-4xl font-black text-yellow-400 tracking-tight">
          SMOKO BREAK
        </div>

        {/* CALLER */}
        {caller && (
          <div className="text-sm text-neutral-400">
            Called by{" "}
            <span className="text-white font-bold">
              {caller.name}
            </span>
          </div>
        )}

        {/* TIMER */}
        <div
          className={`
            text-6xl font-black
            ${
              remaining <= 5
                ? "text-red-500 animate-pulse"
                : "text-white"
            }
          `}
        >
          {remaining}
        </div>

        {/* INFO */}
        <div className="text-xs text-neutral-500 max-w-xs">
          Game paused. Video still active.
          <br />
          Drink responsibly 🍻
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
