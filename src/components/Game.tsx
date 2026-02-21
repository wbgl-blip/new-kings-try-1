/* src/components/Game.tsx */

import React, { useState } from "react";
import { useGameStore } from "../store/gameStore";

import { VideoGrid } from "./VideoGrid";
import { Card } from "./Card";
import { HUD } from "./HUD";

import { MatePicker } from "./MatePicker";
import { TurnGameOverlay } from "./TurnGameOverlay";
import { GotchaModal } from "./GotchaModal";
import { SmokoModal } from "./SmokoModal";
import { ReactionOverlay } from "./ReactionOverlay";

import { motion, AnimatePresence } from "framer-motion";
import { List, ShieldAlert, Maximize, Power } from "lucide-react";
import { cn } from "../utils/cn";

export const Game: React.FC = () => {
  const {
    phase,
    deck,
    activeCard,
    players,
    currentPlayerIndex,
    myPlayerId,
    isHost,
    rules,
    drawCard,
    startGame,
    smokoUntil,
  } = useGameStore();

  const [showRules, setShowRules] = useState(false);
  const [showHostTools, setShowHostTools] = useState(false);

  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;

  /* =============================================
     GAME LOCK STATE
  ============================================= */

  const isPaused = phase === "paused";
  const isTurnGame = phase === "turngame";
  const isReaction = phase === "reaction";

  const locked = isPaused || isTurnGame || isReaction;

  /* =============================================
     FULLSCREEN
  ============================================= */

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen?.();
    }
  };

  /* =============================================
     GAME OVER
  ============================================= */

  if (phase === "gameover") {
    return (
      <div className="flex flex-col h-screen bg-black text-white items-center justify-center space-y-4">

        <h1 className="text-3xl font-black text-green-400">
          Game Over 🍺
        </h1>

        <div className="space-y-1 text-sm text-neutral-400">
          {players.map((p) => (
            <div key={p.id}>
              {p.name}: {p.drinks} 🍺
            </div>
          ))}
        </div>

        {isHost && (
          <button
            onClick={startGame}
            className="mt-4 bg-green-500 text-black px-6 py-3 rounded-xl font-bold"
          >
            New Game
          </button>
        )}

      </div>
    );
  }

  /* =============================================
     MAIN GAME
  ============================================= */

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">

      {/* ================= VIDEO STRIP ================= */}

      <div className="h-1/4 min-h-[120px] bg-neutral-900 p-2 overflow-y-auto">
        <VideoGrid />
      </div>

      {/* ================= TABLE ================= */}

      <div
        className={cn(
          "flex-1 relative flex flex-col items-center justify-center p-4 transition-opacity",
          locked && "opacity-50 pointer-events-none"
        )}
      >

        {/* TURN INDICATOR */}
        <div className="absolute top-3 left-0 right-0 text-center z-10">

          <span
            className={cn(
              "px-4 py-1 rounded-full text-xs font-bold",
              isMyTurn && !locked
                ? "bg-green-500 text-black animate-pulse"
                : "bg-neutral-800 text-neutral-300"
            )}
          >
            {isMyTurn
              ? "YOUR TURN"
              : `${currentPlayer?.name}'s Turn`}
          </span>

        </div>

        {/* CARD TABLE */}
        <div className="relative flex items-center justify-center gap-6">

          {/* DECK */}
          <div className="relative">

            {deck.length > 0 ? (
              <Card
                card={deck[0]}
                faceDown
                onClick={
                  isMyTurn && phase === "playing" && !locked
                    ? drawCard
                    : undefined
                }
                className={cn(
                  "cursor-pointer transition-transform",
                  isMyTurn && !locked && "hover:scale-105"
                )}
              />
            ) : (
              <div className="h-64 w-44 border border-dashed border-neutral-700 rounded-xl flex items-center justify-center text-neutral-600">
                Empty
              </div>
            )}

            <div className="absolute -bottom-6 inset-x-0 text-center text-xs text-neutral-500">
              {deck.length} cards
            </div>

          </div>

          {/* ACTIVE CARD */}
          <AnimatePresence mode="wait">
            {activeCard && (
              <motion.div
                key={activeCard.id}
                initial={{ x: -80, opacity: 0, rotate: -8 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                exit={{ x: 80, opacity: 0, rotate: 8 }}
              >
                <Card card={activeCard} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* ================= RULE STRIP ================= */}

      {rules.length > 0 && (
        <div className="px-3 py-2 bg-neutral-900 border-t border-neutral-800 text-xs max-h-20 overflow-y-auto">

          {rules.map((r) => (
            <div key={r.id}>• {r.text}</div>
          ))}

        </div>
      )}

      {/* ================= HUD ================= */}

      <HUD />

      {/* ================= BOTTOM BAR ================= */}

      <div className="bg-neutral-900 border-t border-neutral-800 p-3 flex justify-between text-neutral-400">

        <button
          onClick={() => setShowRules(true)}
          className="flex flex-col items-center text-xs"
        >
          <List size={18} />
          Rules
        </button>

        <button
          onClick={toggleFullscreen}
          className="flex flex-col items-center text-xs"
        >
          <Maximize size={18} />
          View
        </button>

        {isHost && (
          <button
            onClick={() => setShowHostTools(true)}
            className="flex flex-col items-center text-xs text-red-400"
          >
            <ShieldAlert size={18} />
            Host
          </button>
        )}

      </div>

      {/* ================= MODALS ================= */}

      <AnimatePresence>

        {/* RULES MODAL */}
        {showRules && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 top-1/4 bg-neutral-900 z-40 rounded-t-2xl p-5 overflow-y-auto"
          >

            <div className="flex justify-between mb-4">

              <h2 className="font-bold text-lg">
                Active Rules
              </h2>

              <button
                onClick={() => setShowRules(false)}
                className="text-neutral-400"
              >
                Close
              </button>

            </div>

            {rules.length === 0 && (
              <p className="text-neutral-500">
                No rules yet
              </p>
            )}

            {rules.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-neutral-800 rounded-lg mb-2"
              >
                {r.text}
              </div>
            ))}

          </motion.div>
        )}

        {/* HOST MODAL */}
        {showHostTools && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 bg-neutral-950 z-50 rounded-t-2xl p-5 border-t border-neutral-800"
          >

            <div className="flex justify-between mb-4">

              <h2 className="font-bold text-red-400">
                Host Tools
              </h2>

              <button
                onClick={() => setShowHostTools(false)}
                className="text-neutral-400"
              >
                Close
              </button>

            </div>

            <button
              onClick={startGame}
              className="w-full bg-neutral-800 p-3 rounded-xl font-bold flex justify-center items-center gap-2"
            >
              <Power size={16} />
              Restart Game
            </button>

          </motion.div>
        )}

      </AnimatePresence>

      {/* ================= CORE OVERLAYS ================= */}

      <MatePicker />
      <TurnGameOverlay />
      <GotchaModal />
      <SmokoModal />
      <ReactionOverlay />

    </div>
  );
};
