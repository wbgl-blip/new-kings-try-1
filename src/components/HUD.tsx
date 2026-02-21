/* src/components/HUD.tsx */

import React from "react";
import { useGameStore } from "../store/gameStore";
import { Flame, Pause } from "lucide-react";

export const HUD: React.FC = () => {
  const {
    players,
    myPlayerId,
    drawCard,
    triggerSmoko,
    phase,
    smokoUntil,
  } = useGameStore();

  const me = players.find(p => p.id === myPlayerId);

  const isPaused = phase === "paused";

  const remaining =
    smokoUntil && isPaused
      ? Math.max(0, Math.ceil((smokoUntil - Date.now()) / 1000))
      : 0;

  if (!me) return null;

  return (
    <div className="w-full bg-black border-t border-neutral-800 p-3 space-y-3">

      {/* Player Status */}
      <div className="flex justify-between items-center text-sm">

        <div className="font-bold text-green-400">
          🍺 {me.drinks}
        </div>

        <div className="flex items-center gap-3 text-xs">

          {me.hasThumbMaster && (
            <span className="text-yellow-400">👍</span>
          )}

          {me.isQuestionMaster && (
            <span className="text-purple-400">❓</span>
          )}

          {me.hasHeaven && (
            <span className="text-blue-400">☁️</span>
          )}

          {me.smokoUsed && (
            <span className="text-red-400">🚬</span>
          )}

          <span className="text-neutral-400">
            Mates: {me.mateIds.length}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">

        <button
          onClick={drawCard}
          disabled={phase !== "playing"}
          className="bg-green-500 text-black font-extrabold py-3 rounded-xl disabled:bg-neutral-700 disabled:text-neutral-500 active:scale-[0.98]"
        >
          <Flame size={16} className="inline mr-2" />
          DRAW
        </button>

        <button
          onClick={triggerSmoko}
          disabled={me.smokoUsed || phase !== "playing"}
          className="bg-yellow-500 text-black font-extrabold py-3 rounded-xl disabled:bg-neutral-700 disabled:text-neutral-500 active:scale-[0.98]"
        >
          <Pause size={16} className="inline mr-2" />
          SMOKO
        </button>

      </div>

      {/* Smoko Countdown */}
      {isPaused && (
        <div className="text-center text-xs text-yellow-400 font-bold">
          🚬 Smoko break — resumes in {remaining}s
        </div>
      )}
    </div>
  );
};
