import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { VideoGrid } from './VideoGrid';
import { networkManager } from '../network/NetworkManager';
import { Copy, Maximize, Download } from 'lucide-react';

export const Lobby: React.FC = () => {
  const { createRoom, joinRoom, startGame, roomId, isHost, players } = useGameStore();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'waiting'>('menu');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
        alert("To install: Tap 'Share' then 'Add to Home Screen' (iOS) or use the browser menu (Android).");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    await networkManager.startLocalStream();
    await createRoom(name);
    setMode('waiting');
  };

  const handleJoin = async () => {
    if (!name || !joinCode) return;
    await networkManager.startLocalStream();
    await joinRoom(joinCode, name);
    setMode('waiting');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room code copied!');
  };

  if (mode === 'waiting') {
    return (
      <div className="flex flex-col h-screen bg-slate-900 text-white p-4">
        <header className="flex justify-between items-center mb-4">
           <h1 className="text-xl font-bold">Lobby</h1>
           <div className="flex items-center space-x-2">
             <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full cursor-pointer" onClick={copyCode}>
               <span className="font-mono text-sm">{roomId}</span>
               <Copy size={14} />
             </div>
             <button onClick={toggleFullscreen} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
               <Maximize size={16} />
             </button>
           </div>
        </header>
        
        <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden mb-4">
           <VideoGrid />
        </div>
        
        <div className="space-y-4">
           <div className="text-center text-slate-400">
             {players.length} players ready
           </div>
           
           {isHost ? (
             <button 
               onClick={startGame}
               className="w-full bg-indigo-600 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors"
             >
               Start Game
             </button>
           ) : (
             <div className="text-center text-indigo-400 font-medium py-4">
               Waiting for host to start...
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-900 p-6 space-y-8 relative">
      <div className="absolute top-4 right-4 flex space-x-2">
         <button onClick={handleInstall} className="p-3 bg-slate-800 rounded-full text-indigo-400 hover:text-indigo-300 hover:bg-slate-700 transition-colors">
            <Download size={20} />
         </button>
         <button onClick={toggleFullscreen} className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <Maximize size={20} />
         </button>
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black text-indigo-500 tracking-tighter">KAD KINGS</h1>
        <p className="text-slate-400">The Ultimate Drinking Game</p>
      </div>
      
      <div className="w-full max-w-sm space-y-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none transition-all"
        />
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleCreate}
            disabled={!name}
            className="bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Create Room
          </button>
          
          <div className="space-y-2">
             <input
               type="text"
               placeholder="Room Code"
               value={joinCode}
               onChange={e => setJoinCode(e.target.value)}
               className="w-full bg-slate-800 text-white p-2 rounded-lg border border-slate-700 text-center text-sm"
             />
             <button 
               onClick={handleJoin}
               disabled={!name || !joinCode}
               className="w-full bg-slate-700 text-white p-2 rounded-lg font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors text-sm"
             >
               Join Room
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
