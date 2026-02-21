import { useEffect, useState } from "react";
import { useGameStore } from "./store/gameStore";
import { Lobby } from "./components/Lobby";
import { Game } from "./components/Game";
import { ReactionOverlay } from "./components/ReactionOverlay";
import { TitleScreen } from "./components/TitleScreen";
import { networkManager } from "./network/NetworkManager";

export function App() {
  const phase = useGameStore((state) => state.phase);

  // Title screen is a UI gate in front of the store-driven phase.
  // Keeps the store focused on game state (lobby/game) instead of UI screens.
  const [showTitle, setShowTitle] = useState(() => {
    // Persist so you don't see the title every refresh unless you want to.
    try {
      return sessionStorage.getItem("kad_title_seen") !== "1";
    } catch {
      return true;
    }
  });

  const handleContinue = () => {
    setShowTitle(false);
    try {
      sessionStorage.setItem("kad_title_seen", "1");
    } catch {
      // ignore
    }
  };

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      networkManager.cleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {showTitle ? (
        <TitleScreen onContinue={handleContinue} />
      ) : phase === "lobby" ? (
        <Lobby />
      ) : (
        <Game />
      )}

      {/* Global Overlays */}
      <ReactionOverlay />
    </div>
  );
}
