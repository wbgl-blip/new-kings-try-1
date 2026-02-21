import React from "react";
import { useGameStore } from "../store/gameStore";
import { useMediaMesh } from "../hooks/useMediaMesh";
import { PlayerAvatar } from "./PlayerAvatar";
import { networkManager } from "../network/NetworkManager";
import { cn } from "../utils/cn";

export const VideoGrid: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const streams = useMediaMesh();

  /* ======================================================
     GRID LOGIC
  ====================================================== */

  const count = players.length;

  let gridClass = "grid-cols-1";

  if (count === 2) gridClass = "grid-cols-2";
  else if (count <= 4) gridClass = "grid-cols-2";
  else gridClass = "grid-cols-3";

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div
      className={cn(
        "grid gap-2 w-full h-full",
        gridClass
      )}
    >
      {players.map((player) => {
        const isLocal = player.id === myPlayerId;

        const stream = isLocal
          ? networkManager.localStream
          : streams[player.peerId];

        return (
          <div
            key={player.id}
            className={cn(
              "relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-800 transition-all",
              player.activeSpeaker &&
                "ring-2 ring-green-500"
            )}
          >
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
