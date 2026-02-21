import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useMediaMesh } from '../hooks/useMediaMesh';
import { PlayerAvatar } from './PlayerAvatar';
import { networkManager } from '../network/NetworkManager';
import { cn } from '../utils/cn';

export const VideoGrid: React.FC = () => {
  const players = useGameStore(state => state.players);
  const myPlayerId = useGameStore(state => state.myPlayerId);
  const streams = useMediaMesh();

  // Determine grid columns based on player count
  // 1-2: 1 col (or 2 cols?)
  // 3-4: 2 cols
  // 5-6: 3 cols
  const gridClass = players.length <= 2 ? "grid-cols-2" : players.length <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={cn("grid gap-2 h-full w-full", gridClass)}>
      {players.map(player => {
        const isLocal = player.id === myPlayerId;
        const stream = isLocal ? networkManager.localStream : streams[player.peerId];

        return (
           <div key={player.id} className="aspect-video w-full h-full min-h-[100px]">
             <PlayerAvatar 
               player={player} 
               stream={stream} 
               isLocal={isLocal} 
               isActive={player.activeSpeaker}
             />
           </div>
        );
      })}
    </div>
  );
};
