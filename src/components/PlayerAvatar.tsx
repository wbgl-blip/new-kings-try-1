import React, { useEffect, useRef } from "react";
import { Player } from "../types";
import { cn } from "../utils/cn";
import {
  MicOff,
  Crown,
  ThumbsUp,
  HelpCircle,
  VideoOff,
} from "lucide-react";

interface PlayerAvatarProps {
  player: Player;
  stream?: MediaStream;
  isLocal?: boolean;
  isActive?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  stream,
  isLocal = false,
  isActive = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ======================================================
     ATTACH STREAM
  ====================================================== */

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream) return;

    // Attach stream
    video.srcObject = stream;

    // Force play (fixes mobile Safari / Android issues)
    const play = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn("Video autoplay blocked:", err);
      }
    };

    play();

    return () => {
      // Cleanup old stream
      video.srcObject = null;
    };
  }, [stream]);

  /* ======================================================
     FALLBACK LETTER
  ====================================================== */

  const initial =
    player.name?.trim()?.[0]?.toUpperCase() ?? "?";

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-neutral-800 shadow-md transition-all duration-200",
        isActive
          ? "ring-2 ring-green-400 scale-[1.02]"
          : "ring-1 ring-neutral-700"
      )}
    >
      {/* VIDEO / PLACEHOLDER */}

      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          disablePictureInPicture
          className="h-full w-full object-cover bg-black"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-700 text-neutral-300 space-y-1">
          <VideoOff size={20} />
          <div className="text-2xl font-black">
            {initial}
          </div>
        </div>
      )}

      {/* OVERLAY */}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-black/20 px-2 py-1.5">

        {/* Name + Icons */}
        <div className="flex items-center justify-between text-white gap-1">

          <span className="truncate text-xs font-semibold">
            {player.name}
            {isLocal && " (You)"}
          </span>

          <div className="flex items-center gap-1 shrink-0">

            {!player.micEnabled && (
              <MicOff
                size={12}
                className="text-red-400"
              />
            )}

            {player.isHost && (
              <Crown
                size={12}
                className="text-yellow-400"
              />
            )}

            {player.hasThumbMaster && (
              <ThumbsUp
                size={12}
                className="text-green-400"
              />
            )}

            {player.isQuestionMaster && (
              <HelpCircle
                size={12}
                className="text-purple-400"
              />
            )}
          </div>

        </div>

        {/* Stats */}
        <div className="text-[10px] text-neutral-300 leading-tight">
          🍺 {player.drinks}
        </div>

      </div>
    </div>
  );
};
