import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { VideoGrid } from './VideoGrid';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { List, BarChart3, ShieldAlert, Power, Maximize } from 'lucide-react';
import { cn } from '../utils/cn';

export const Game: React.FC = () => {
  const { 
    phase, 
    deck, 
    activeCard, 
    players, 
    currentPlayerIndex, 
    myPlayerId, 
    isHost,
    drawCard, 
    triggerReaction,
    resetGame,
    rules,
    kingsCount
  } = useGameStore();

  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHostTools, setShowHostTools] = useState(false);

  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const me = players.find(p => p.id === myPlayerId);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  // Power actions
  const handleHeaven = () => {
     if (me?.hasHeaven) {
       triggerReaction();
       // TODO: Consume heaven? or is it permanent until transferred?
       // Prompt says "transfers on new 7". So it stays. 
       // But "manual trigger" implies I decide when.
     }
  };
  
  const handleThumb = () => {
      if (me?.hasThumbMaster) {
          triggerReaction(); // Reusing reaction mechanism for thumb master?
          // Thumb master is "silently place thumb". 
          // If we use the fullscreen overlay, it's not silent.
          // Maybe we just send a toast? Or use the reaction overlay but different text?
          // For now, let's use triggerReaction for simplicity or add a specific one.
      }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* Top Bar - Video Grid */}
      <div className="h-1/4 min-h-[120px] bg-slate-800 p-2 overflow-y-auto">
        <VideoGrid />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 space-y-8">
        
        {/* Turn Indicator */}
        <div className="absolute top-4 left-0 right-0 text-center">
            <span className={cn(
                "px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-colors",
                isMyTurn ? "bg-indigo-600 text-white animate-pulse" : "bg-slate-700 text-slate-300"
            )}>
                {isMyTurn ? "YOUR TURN" : `${currentPlayer?.name}'s Turn`}
            </span>
        </div>

        {/* Card Table */}
        <div className="relative flex items-center justify-center space-x-8">
            {/* Deck */}
            <div className="relative">
                {deck.length > 0 ? (
                    <Card 
                        card={deck[0]} 
                        faceDown 
                        onClick={isMyTurn && phase === 'playing' ? drawCard : undefined}
                        className={cn("cursor-pointer transition-transform", isMyTurn && "hover:scale-105 shadow-indigo-500/50 shadow-2xl")}
                    />
                ) : (
                    <div className="h-64 w-44 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600">
                        Empty
                    </div>
                )}
                <div className="absolute -bottom-8 left-0 right-0 text-center text-sm text-slate-500">
                    {deck.length} cards
                </div>
            </div>

            {/* Active Card */}
            <AnimatePresence mode="wait">
                {activeCard && (
                    <motion.div
                        key={activeCard.id}
                        initial={{ x: -100, opacity: 0, rotate: -10 }}
                        animate={{ x: 0, opacity: 1, rotate: 0 }}
                        exit={{ x: 100, opacity: 0, rotate: 10 }}
                        className="relative z-10"
                    >
                        <Card card={activeCard} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Action Bar */}
        <div className="w-full max-w-md grid grid-cols-4 gap-2 px-4">
             {/* Powers */}
             <button 
                disabled={!me?.hasHeaven}
                onClick={handleHeaven}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-sky-900/50 disabled:opacity-20 hover:bg-sky-800 transition-colors"
             >
                 <span className="text-xl">☝️</span>
                 <span className="text-xs mt-1">Heaven</span>
             </button>
             
             <button 
                disabled={!me?.hasThumbMaster}
                onClick={handleThumb}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-900/50 disabled:opacity-20 hover:bg-amber-800 transition-colors"
             >
                 <span className="text-xl">👍</span>
                 <span className="text-xs mt-1">Thumb</span>
             </button>

             {/* Draw Button (Main Action) */}
             <button 
                onClick={drawCard}
                disabled={!isMyTurn || phase !== 'playing'}
                className="col-span-2 bg-indigo-600 rounded-lg font-bold text-lg shadow-lg disabled:opacity-50 disabled:shadow-none hover:bg-indigo-500 active:scale-95 transition-all"
             >
                DRAW
             </button>
        </div>
        
        {/* King Counter */}
        <div className="absolute bottom-20 right-4 flex items-center space-x-1 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <span className="text-yellow-500">👑</span>
            <span className="font-mono">{kingsCount}/4</span>
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="bg-slate-800 p-4 pb-8 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => setShowRules(!showRules)} className="p-2 text-slate-400 hover:text-white flex flex-col items-center">
            <List size={20} />
            <span className="text-[10px] mt-1">Rules</span>
        </button>
        <button onClick={() => setShowStats(!showStats)} className="p-2 text-slate-400 hover:text-white flex flex-col items-center">
            <BarChart3 size={20} />
            <span className="text-[10px] mt-1">Stats</span>
        </button>
        <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-white flex flex-col items-center">
            <Maximize size={20} />
            <span className="text-[10px] mt-1">View</span>
        </button>
        {isHost && (
            <button onClick={() => setShowHostTools(!showHostTools)} className="p-2 text-red-400 hover:text-red-200 flex flex-col items-center">
                <ShieldAlert size={20} />
                <span className="text-[10px] mt-1">Host</span>
            </button>
        )}
      </div>

      {/* Drawers/Modals */}
      <AnimatePresence>
        {showRules && (
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="fixed inset-x-0 bottom-0 top-1/4 bg-slate-800 rounded-t-2xl z-30 p-6 shadow-2xl overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Active Rules</h2>
                    <button onClick={() => setShowRules(false)} className="text-slate-400">Close</button>
                </div>
                <div className="space-y-4">
                    {rules.length === 0 && <p className="text-slate-500">No active rules yet.</p>}
                    {rules.map(rule => (
                        <div key={rule.id} className="p-4 bg-slate-700 rounded-lg">
                            <p className="font-medium">{rule.text}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {showHostTools && (
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="fixed inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 rounded-t-2xl z-40 p-6 shadow-2xl"
            >
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-red-400">Host Tools</h2>
                    <button onClick={() => setShowHostTools(false)} className="text-slate-400">Close</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={resetGame} className="flex items-center justify-center p-4 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm">
                        <Power className="mr-2" size={16} /> Reset Game
                    </button>
                    {/* Add more tools */}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
