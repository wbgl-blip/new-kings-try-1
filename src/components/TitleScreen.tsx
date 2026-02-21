import React from "react";

type TitleScreenProps = {
  onContinue: () => void;
};

export function TitleScreen({ onContinue }: TitleScreenProps) {
  return (
    <div
      className="w-full h-full flex items-center justify-center p-4"
      style={{ minHeight: "100svh" }}
    >
      <div className="w-full max-w-[440px]">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex flex-col items-center text-center gap-3">
            <img
              src="/kylesadick-logo.png"
              alt="Kyle's A Dick"
              className="w-[260px] max-w-full h-auto"
              onError={(e) => {
                // Hide broken image icon if logo isn't uploaded yet
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />

            <div className="text-2xl font-extrabold tracking-tight">KAD Kings</div>

            <div className="text-sm opacity-80 leading-snug">
              Multiplayer Kings drinking game — tight UI, synced state, reaction mode.
            </div>

            <button
              onClick={onContinue}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-extrabold text-base active:scale-[0.99]"
            >
              Enter Lobby
            </button>

            <div className="text-xs opacity-60 pt-1">
              Upload your logo as <span className="font-semibold">public/kylesadick-logo.png</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
