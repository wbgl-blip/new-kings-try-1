import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { ReactionOverlay } from './components/ReactionOverlay';
import { networkManager } from './network/NetworkManager';

export function App() {
  const phase = useGameStore(state => state.phase);
  
  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      networkManager.cleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {phase === 'lobby' ? (
        <Lobby />
      ) : (
        <Game />
      )}
      
      {/* Global Overlays */}
      <ReactionOverlay />
      
      {/* Toast Container could go here */}
    </div>
  );
}
