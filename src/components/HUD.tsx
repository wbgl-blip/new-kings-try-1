/* src/components/HUD.tsx */

import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Pause, Cigarette } from "lucide-react";

export const HUD: React.FC = () => {
  const {
    players,
    myPlayerId,

    triggerSmoko,

    phase,
    smokoUntil,
    smokoCallerId,

    turnGame,
  } = useGameStore();

  const me = players.find((p) => p.id === myPlayerId);

  const [now, setNow] = useState(Date.now());

  /* ======================================================
     TIMER REFRESH (FOR SMOKO COUNTDOWN)
  ====================================================== */

  useEffect(() => {
    if (phase !== "paused") return;

    const i = setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => clearInterval(i);
  }, [phase]);

  if (!me) return null;

  /* ======================================================
     STATE
  ====================================================== */

  const isPaused = phase === "paused";
  const isTurnGame = phase === "turngame";
  const isReaction = phase === "reaction";

  const locked = isPaused || isTurnGame || isReaction;

  const remaining =
    smokoUntil && isPaused
      ? Math.max(0, Math.ceil((smokoUntil - now) / 1000))
      : 0;

  const caller = players.find((p) => p.id === smokoCallerId);

  const mates = me.mateIds ?? [];

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="w-full bg-black border-t border-neutral-800 p-3 space-y-3">

      {/* =============================================
          PLAYER STATUS
      ============================================= */}

      <div className="flex justify-between items-center text-sm">

        {/* DRINK COUNT */}
        <div className="font-extrabold text-green-400">
          🍺 {me.drinks}
        </div>

        {/* POWERS */}
        <div className="flex items-center gap-3 text-xs">

          {me.hasThumbMaster && (
            <span
              title="Thumb Master"
              className="text-yellow-400"
            >
              👍
            </span>
          )}

          {me.isQuestionMaster && (
            <span
              title="Question Master"
              className="text-purple-400"
            >
              ❓
            </span>
          )}

          {me.hasHeaven && (
            <span
              title="Heaven"
              className="text-blue-400"
            >
              ☁️
            </span>
          )}

          {me.smokoUsed && (
            <span
              title="Smoko Used"
              className="text-red-400"
            >
              🚬
            </span>
          )}

          <span className="text-neutral-400">
            Mates: {mates.length}
          </span>
        </div>
      </div>

      {/* =============================================
          BUTTONS
      ============================================= */}

      <div className="grid grid-cols-1 gap-3">

        {/* SMOKO */}
        <button
          onClick={triggerSmoko}
          disabled={me.smokoUsed || locked}
          className={`
            font-extrabold py-3 rounded-xl transition
            ${
              me.smokoUsed || locked
                ? "bg-neutral-700 text-neutral-500"
                : "bg-yellow-500 text-black active:scale-[0.97]"
            }
          `}
        >
          <Pause size={16} className="inline mr-2" />
          SMOKO
        </button>
      </div>

      {/* =============================================
          SMOKO OVERLAY INFO
      ============================================= */}

      {isPaused && (
        <div className="bg-neutral-900 border border-yellow-600/30 rounded-lg p-2 text-center space-y-1">

          <div className="text-yellow-400 font-bold text-xs flex justify-center items-center gap-1">
            <Cigarette size={14} />
            SMOKO BREAK
          </div>

          {caller && (
            <div className="text-[11px] text-neutral-400">
              Called by{" "}
              <span className="text-white font-semibold">
                {caller.name}
              </span>
            </div>
          )}

          <div className="text-xs text-yellow-300 font-bold">
            Resumes in {remaining}s
          </div>
        </div>
      )}

      {/* =============================================
          TURN GAME INFO
      ============================================= */}

      {isTurnGame && (
        <div className="bg-neutral-900 border border-purple-600/30 rounded-lg p-2 text-center">

          <div className="text-purple-400 font-bold text-xs">
            🎤 TURN GAME ACTIVE
          </div>

          <div className="text-[11px] text-neutral-400 mt-1">
            Mode: {turnGame.mode}
          </div>
        </div>
      )}

      {/* =============================================
          REACTION INFO
      ============================================= */}

      {isReaction && (
        <div className="bg-neutral-900 border border-red-600/30 rounded-lg p-2 text-center">

          <div className="text-red-400 font-bold text-xs">
            ⚡ REACTION MODE
          </div>

          <div className="text-[11px] text-neutral-400 mt-1">
            Tap fast or drink
          </div>
        </div>
      )}
    </div>
  );
};
