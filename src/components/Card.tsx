import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../types';
import { cn } from '../utils/cn';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  className?: string;
  faceDown?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, onClick, className, faceDown }) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  const suitIcon = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit];

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative flex h-64 w-44 flex-col items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4 shadow-xl select-none",
        faceDown ? "bg-indigo-600 bg-opacity-100" : "bg-white",
        className
      )}
    >
      {faceDown ? (
        <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-500">
           <span className="text-4xl font-bold text-white opacity-50">KAD</span>
        </div>
      ) : (
        <>
          <div className={cn("self-start text-3xl font-bold", isRed ? "text-red-500" : "text-slate-900")}>
            {card.rank}
          </div>
          <div className={cn("text-6xl", isRed ? "text-red-500" : "text-slate-900")}>
            {suitIcon}
          </div>
          <div className="text-center">
             <div className="font-bold text-slate-800">{card.ruleTitle}</div>
             <div className="text-xs text-slate-500 leading-tight mt-1">{card.text}</div>
          </div>
          <div className={cn("self-end rotate-180 text-3xl font-bold", isRed ? "text-red-500" : "text-slate-900")}>
            {card.rank}
          </div>
        </>
      )}
    </motion.div>
  );
};
