import React, { useState } from "react";

type TitleScreenProps = {
  onContinue: () => void;
};

export function TitleScreen({ onContinue }: TitleScreenProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ minHeight: "100svh" }}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-900 to-black" />
      <div className="absolute w-[400px] h-[400px] bg-green-500/10 blur-3xl rounded-full top-[-100px] left-[-100px]" />
      <div className="absolute w-[300px] h-[300px] bg-green-400/10 blur-3xl rounded-full bottom-[-100px] right-[-100px]" />

      <div className="relative w-full max-w-[420px] px-4">
        <div className="rounded-2xl border border-green-500/20 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">

          <div className="flex flex-col items-center text-center gap-4">

            {/* Logo */}
            {!logoError && (
              <img
                src="/kylesadick-logo.png"
                alt="Kyle's A Dick"
                className="w-[260px] max-w-full h-auto drop-shadow-xl"
                onError={() => setLogoError(true)}
              />
            )}

            {/* Fallback Title */}
            {logoError && (
              <div className="text-3xl font-extrabold tracking-tight text-green-400">
                Kyle's A Dick
              </div>
            )}

            <div className="text-xl font-extrabold text-white tracking-tight">
              KAD Kings
            </div>

            <div className="text-sm text-neutral-400 leading-snug max-w-[300px]">
              Multiplayer Kings drinking game. Synced. Fast. Degenerate.
            </div>

            <button
              onClick={onContinue}
              className="mt-4 w-full rounded-xl bg-green-500 hover:bg-green-400 active:scale-[0.98] transition-all px-4 py-3 font-extrabold text-black text-base shadow-lg shadow-green-500/30"
            >
              ENTER THE CHAOS
            </button>

            <div className="text-xs text-neutral-500 pt-2">
              Upload logo to <span className="text-neutral-300">public/kylesadick-logo.png</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
