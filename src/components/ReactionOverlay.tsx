import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export const ReactionOverlay: React.FC = () => {
  const { lastReactionStart, tapReaction, reactionResults, players, myPlayerId } = useGameStore();

  const show = !!lastReactionStart;
  const myResult = reactionResults.find(r => r.playerId === myPlayerId);
  const hasTapped = !!myResult;

  if (!show && reactionResults.length === 0) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 touch-manipulation"
          onClick={!hasTapped ? tapReaction : undefined}
        >
          {!hasTapped ? (
             <div className="text-white text-6xl font-black animate-pulse">TAP!</div>
          ) : (
             <div className="text-white text-center space-y-4">
               <div className="text-4xl font-bold">Rank: {myResult.rank}</div>
               <div className="text-2xl">{(myResult.time / 1000).toFixed(3)}s</div>
               <div className="mt-8 space-y-2">
                 {reactionResults.map(r => {
                    const p = players.find(p => p.id === r.playerId);
                    return (
                        <div key={r.playerId} className="text-lg opacity-80">
                            #{r.rank} {p?.name}: {(r.time/1000).toFixed(3)}s
                        </div>
                    );
                 })}
               </div>
             </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
