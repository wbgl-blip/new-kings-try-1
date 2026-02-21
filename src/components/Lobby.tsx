import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { VideoGrid } from "./VideoGrid";
import { networkManager } from "../network/NetworkManager";
import {
  Copy,
  Crown,
  Maximize,
  Download,
  CheckCircle,
  Circle,
} from "lucide-react";

export const Lobby: React.FC = () => {
  const {
    createRoom,
    joinRoom,
    startGame,
    roomId,
    isHost,
    players,
    myPlayerId,
    setMyReady,
  } = useGameStore();

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"menu" | "waiting">("menu");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const me = players.find((p) => p.id === myPlayerId);
  const myReady = !!me?.ready;

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert(
        "To install: Tap Share → Add to Home Screen (iOS) or use browser menu (Android)."
      );
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen?.();
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room code copied");
  };

  const allReady = players.length >= 2 && players.every((p) => p.ready);

  const handleCreate = async () => {
    if (!name) return;

    await networkManager.startLocalStream();
    await createRoom(name);

    // Host is ready by default, but enforce via store anyway
    setMyReady(true);
    setMode("waiting");
  };

  const handleJoin = async () => {
    if (!name || !joinCode) return;

    await networkManager.startLocalStream();
    await joinRoom(joinCode, name);

    setMyReady(true);
    setMode("waiting");
  };

  const toggleReady = () => {
    setMyReady(!myReady);
  };

  if (mode === "waiting") {
    return (
      <div className="flex flex-col h-screen bg-black text-white p-3">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-2">
          <div className="font-extrabold tracking-tight text-green-400">
            KAD Lobby
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1 bg-neutral-800 px-3 py-1 rounded-full text-xs"
            >
              <span className="font-mono">{roomId}</span>
              <Copy size={12} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-neutral-800 rounded-full"
            >
              <Maximize size={14} />
            </button>
          </div>
        </header>

        {/* VIDEO */}
        <div className="flex-1 bg-neutral-900 rounded-xl overflow-hidden mb-2">
          <VideoGrid />
        </div>

        {/* PLAYER LIST */}
        <div className="bg-neutral-900 rounded-xl p-3 mb-2 space-y-1">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {p.isHost && (
                  <Crown size={14} className="text-yellow-400" />
                )}

                <span className="font-medium">
                  {p.name}
                  {p.id === myPlayerId ? " (you)" : ""}
                </span>
              </div>

              {p.ready ? (
                <CheckCircle size={16} className="text-green-400" />
              ) : (
                <Circle size={16} className="text-neutral-500" />
              )}
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="space-y-2">
          <button
            onClick={toggleReady}
            className={`w-full py-3 rounded-xl font-bold ${
              myReady ? "bg-neutral-700" : "bg-green-500 text-black"
            }`}
          >
            {myReady ? "NOT READY" : "READY UP"}
          </button>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={!allReady}
              className="w-full py-3 rounded-xl font-extrabold bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              START GAME
            </button>
          ) : (
            <div className="text-center text-xs text-neutral-400 py-1">
              Waiting for host…
            </div>
          )}

          {!allReady && isHost && (
            <div className="text-center text-[11px] text-neutral-500">
              Need 2+ players and everyone ready.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-black p-6 space-y-6 relative">
      {/* TOP BUTTONS */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={handleInstall}
          className="p-3 bg-neutral-800 rounded-full text-green-400"
        >
          <Download size={18} />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-3 bg-neutral-800 rounded-full"
        >
          <Maximize size={18} />
        </button>
      </div>

      {/* TITLE */}
      <div className="text-center space-y-1">
        <h1 className="text-4xl font-black text-green-400 tracking-tight">
          KAD KINGS
        </h1>
        <p className="text-neutral-400 text-sm">Multiplayer drinking chaos</p>
      </div>

      {/* FORM */}
      <div className="w-full max-w-sm space-y-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-neutral-900 text-white p-3 rounded-xl border border-neutral-700 focus:border-green-500 outline-none"
        />

        <button
          onClick={handleCreate}
          disabled={!name}
          className="w-full bg-green-500 text-black p-3 rounded-xl font-bold disabled:opacity-50"
        >
          Create Room
        </button>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Room Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="w-full bg-neutral-900 text-white p-2 rounded-lg border border-neutral-700 text-center text-sm"
          />

          <button
            onClick={handleJoin}
            disabled={!name || !joinCode}
            className="w-full bg-neutral-800 p-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
};
