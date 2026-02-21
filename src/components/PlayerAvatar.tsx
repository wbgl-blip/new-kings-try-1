import React, { useEffect, useRef } from 'react';
import { Player } from '../types';
import { cn } from '../utils/cn';
import { MicOff, Crown, ThumbsUp, HelpCircle } from 'lucide-react';

interface PlayerAvatarProps {
  player: Player;
  stream?: MediaStream;
  isLocal?: boolean;
  isActive?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, stream, isLocal, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-slate-800 shadow-md transition-all duration-300",
      isActive ? "ring-4 ring-indigo-500" : "ring-1 ring-slate-700"
    )}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal} 
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-700">
           <span className="text-2xl font-bold text-slate-400">{player.name[0]?.toUpperCase()}</span>
        </div>
      )}
      
      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between text-white">
          <span className="truncate text-sm font-medium">{player.name} {isLocal && '(You)'}</span>
          <div className="flex space-x-1">
             {!player.micEnabled && <MicOff size={14} className="text-red-400" />}
             {player.isHost && <Crown size={14} className="text-yellow-400" />}
             {player.hasThumbMaster && <ThumbsUp size={14} className="text-green-400" />}
             {player.isQuestionMaster && <HelpCircle size={14} className="text-purple-400" />}
          </div>
        </div>
        <div className="text-xs text-slate-300">Drinks: {player.drinks}</div>
      </div>
    </div>
  );
};
