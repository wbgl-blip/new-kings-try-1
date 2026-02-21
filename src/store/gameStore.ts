import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, GameStats, Rank } from '../types';
import { generateDeck } from '../constants';
import { networkManager } from '../network/NetworkManager';

interface GameStore extends GameState {
  myPlayerId: string;
  isHost: boolean;
  
  // Actions
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  startGame: () => void;
  drawCard: () => void;
  
  // Reaction Game
  triggerReaction: () => void;
  tapReaction: () => void;
  resolveReaction: () => void;

  // Modifiers
  updatePlayerStats: (playerId: string, drinks: number) => void;
  makeRule: (text: string) => void;
  setQuestionMaster: (playerId: string) => void;
  setThumbMaster: (playerId: string) => void;
  useHeaven: () => void;
  
  // Host Tools
  kickPlayer: (playerId: string) => void;
  resetGame: () => void;
  
  // Internals
  receiveState: (state: Partial<GameState>) => void;
}

const INITIAL_STATS: GameStats = {
  totalDrinks: 0,
  cardsDrawn: 0,
  reactionsTriggered: 0,
  gotchas: 0,
};

const INITIAL_STATE: GameState = {
  roomId: '',
  players: [],
  deck: [],
  discardPile: [],
  activeCard: null,
  phase: 'lobby',
  currentPlayerIndex: 0,
  kingsCount: 0,
  rules: [],
  reactionResults: [],
  stats: INITIAL_STATS,
  turnDirection: 1,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,
  myPlayerId: '',
  isHost: false,

  createRoom: async (playerName: string) => {
    const peerId = await networkManager.initialize();
    const playerId = uuidv4();
    
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: true,
      peerId,
      ready: true,
      drinks: 0,
      isQuestionMaster: false,
      hasThumbMaster: false,
      hasHeaven: false,
      cameraEnabled: true,
      micEnabled: true,
      activeSpeaker: false,
    };

    set({
      roomId: peerId,
      isHost: true,
      myPlayerId: playerId,
      players: [hostPlayer],
      deck: generateDeck(),
    });

    // Setup network listeners
    networkManager.onMessage((msg, senderPeerId) => {
       const state = get();
       if (!state.isHost) return; // Only host processes inputs logic
       
       switch (msg.type) {
         case 'PLAYER_JOIN':
            const newPlayer: Player = { ...msg.player, peerId: senderPeerId, ready: true, drinks: 0, isQuestionMaster: false, hasThumbMaster: false, hasHeaven: false, cameraEnabled: true, micEnabled: true, activeSpeaker: false };
            const updatedPlayers = [...state.players, newPlayer];
            const newState = { players: updatedPlayers };
            set(newState);
            networkManager.broadcast({ type: 'SYNC_STATE', state: { ...get(), ...newState } });
            break;
            
         case 'REACTION_TAP':
            if (state.phase === 'playing' && state.lastReactionStart) {
                const reactionTime = msg.time - state.lastReactionStart;
                const newResult = { playerId: msg.playerId, time: reactionTime, rank: 0 };
                const newResults = [...state.reactionResults, newResult].sort((a, b) => a.time - b.time);
                // Assign ranks
                newResults.forEach((r, i) => r.rank = i + 1);
                
                set({ reactionResults: newResults });
                networkManager.broadcast({ type: 'SYNC_STATE', state: { reactionResults: newResults } });
                
                if (newResults.length === state.players.length) {
                    get().resolveReaction();
                }
            }
            break;
            
         case 'DRAW_REQUEST':
             if (state.phase === 'playing') {
                 const currentPlayer = state.players[state.currentPlayerIndex];
                 if (currentPlayer && currentPlayer.id === msg.playerId) {
                     get().drawCard();
                 }
             }
             break;
       }
    });
    
    return peerId;
  },

  joinRoom: async (roomId: string, playerName: string) => {
    const peerId = await networkManager.initialize();
    const playerId = uuidv4();
    
    set({
      roomId,
      isHost: false,
      myPlayerId: playerId,
    });

    await networkManager.connectToHost(roomId);
    
    // Send Join Request
    networkManager.sendToHost({
      type: 'PLAYER_JOIN',
      player: {
        id: playerId,
        name: playerName,
        isHost: false,
        peerId,
        ready: true,
        drinks: 0,
        isQuestionMaster: false,
        hasThumbMaster: false,
        hasHeaven: false,
        cameraEnabled: true,
        micEnabled: true,
        activeSpeaker: false,
      }
    });

    networkManager.onMessage((msg) => {
      if (msg.type === 'SYNC_STATE') {
        get().receiveState(msg.state);
      }
    });
  },

  receiveState: (newState) => {
    set((state) => ({ ...state, ...newState }));
  },

  startGame: () => {
    const state = get();
    if (!state.isHost) return;
    
    const newState: Partial<GameState> = {
      phase: 'playing',
      deck: generateDeck(), // Reshuffle
      currentPlayerIndex: 0,
      kingsCount: 0,
      rules: [],
      stats: INITIAL_STATS
    };
    
    set(newState);
    networkManager.broadcast({ type: 'SYNC_STATE', state: { ...state, ...newState } });
  },

  drawCard: () => {
    const state = get();
    
    // Client handling
    if (!state.isHost) {
        networkManager.sendToHost({ type: 'DRAW_REQUEST', playerId: state.myPlayerId });
        return;
    }
        
    // Host handling
    if (state.deck.length === 0) return;
    
    const card = state.deck[0];
    const newDeck = state.deck.slice(1);
    const newDiscard = [card, ...state.discardPile];
    
    let nextPlayerIndex = (state.currentPlayerIndex + state.turnDirection + state.players.length) % state.players.length;
    let newKingsCount = state.kingsCount;
    let nextPhase = state.phase;
    
    // Logic to modify players (e.g. transfer powers)
    const updatedPlayers = [...state.players];
    const currentPlayer = updatedPlayers[state.currentPlayerIndex];
    let thumbMasterId = state.thumbMasterId;
    let questionMasterId = state.questionMasterId;

    // Apply Card Rules
    const r: Rank = card.rank;
    
    if (r === 'K') {
        newKingsCount++;
        if (newKingsCount >= 4) {
            nextPhase = 'gameover';
        }
    } else if (r === '7') {
        updatedPlayers.forEach(p => p.hasHeaven = false);
        currentPlayer.hasHeaven = true;
    } else if (r === 'J') {
        // Thumbmaster
        updatedPlayers.forEach(p => p.hasThumbMaster = false);
        currentPlayer.hasThumbMaster = true;
        thumbMasterId = currentPlayer.id;
    } else if (r === 'Q') {
        // Question Master
        updatedPlayers.forEach(p => p.isQuestionMaster = false);
        currentPlayer.isQuestionMaster = true;
        questionMasterId = currentPlayer.id;
    }

    const newStateUpdates: Partial<GameState> = {
        deck: newDeck,
        discardPile: newDiscard,
        activeCard: card,
        currentPlayerIndex: nextPlayerIndex,
        kingsCount: newKingsCount,
        phase: nextPhase,
        players: updatedPlayers,
        thumbMasterId,
        questionMasterId,
        stats: {
            ...state.stats,
            cardsDrawn: state.stats.cardsDrawn + 1
        }
    };

    set(newStateUpdates);
    networkManager.broadcast({ type: 'SYNC_STATE', state: { ...state, ...newStateUpdates } });
    
    // Triggers for reactions
    if (r === '7' || r === 'J') {
         // Maybe trigger a brief visual cue? 
         // But "7 Heaven" says manual trigger. J Thumbmaster says manual trigger.
         // So we don't auto-trigger reaction.
    }
  },

  tapReaction: () => {
      const state = get();
      if (!state.lastReactionStart) return;
      const time = Date.now();
      
      if (state.isHost) {
          // Host logic
           const reactionTime = time - state.lastReactionStart;
           const newResult = { playerId: state.myPlayerId, time: reactionTime, rank: 0 };
           const newResults = [...state.reactionResults, newResult].sort((a, b) => a.time - b.time);
           newResults.forEach((r, i) => r.rank = i + 1);
           
           set({ reactionResults: newResults });
           networkManager.broadcast({ type: 'SYNC_STATE', state: { reactionResults: newResults } });
           
           if (newResults.length === state.players.length) {
               get().resolveReaction();
           }
      } else {
          networkManager.sendToHost({ type: 'REACTION_TAP', playerId: state.myPlayerId, time });
      }
  },

  resolveReaction: () => {
      // Host only
      const state = get();
      if (!state.isHost) return;
      
      // Last player drinks is implied by rank.
      // Reset reaction state after delay
      setTimeout(() => {
           const newState = { lastReactionStart: undefined, reactionResults: [] };
           set(newState);
           networkManager.broadcast({ type: 'SYNC_STATE', state: newState });
      }, 3000);
  },

  updatePlayerStats: (playerId, drinks) => {
    const state = get();
    if (!state.isHost) return; 
    
    const updatedPlayers = state.players.map(p => 
      p.id === playerId ? { ...p, drinks: p.drinks + drinks } : p
    );
    const newStats = { ...state.stats, totalDrinks: state.stats.totalDrinks + drinks };
    
    set({ players: updatedPlayers, stats: newStats });
    networkManager.broadcast({ type: 'SYNC_STATE', state: { players: updatedPlayers, stats: newStats } });
  },

  makeRule: (text) => {
    const state = get();
    if (!state.isHost) return;
    
    const newRule = { id: uuidv4(), text, createdBy: state.players[state.currentPlayerIndex]?.id || 'host' };
    const newRules = [...state.rules, newRule];
    
    set({ rules: newRules });
    networkManager.broadcast({ type: 'SYNC_STATE', state: { rules: newRules } });
  },

  setQuestionMaster: (playerId) => {
    const state = get();
    if (!state.isHost) return;
    
    const updatedPlayers = state.players.map(p => ({
      ...p,
      isQuestionMaster: p.id === playerId
    }));
    
    set({ players: updatedPlayers, questionMasterId: playerId });
    networkManager.broadcast({ type: 'SYNC_STATE', state: { players: updatedPlayers, questionMasterId: playerId } });
  },

  setThumbMaster: (playerId) => {
    const state = get();
    if (!state.isHost) return;
    
    const updatedPlayers = state.players.map(p => ({
      ...p,
      hasThumbMaster: p.id === playerId
    }));

    set({ players: updatedPlayers, thumbMasterId: playerId });
    networkManager.broadcast({ type: 'SYNC_STATE', state: { players: updatedPlayers, thumbMasterId: playerId } });
  },

  useHeaven: () => {
     // Implementation for using stored heaven card
     // For now it just stays until transferred. 
  },

  triggerReaction: () => {
    const state = get();
    if (!state.isHost) return;
    
    const now = Date.now();
    set({ lastReactionStart: now, reactionResults: [] });
    networkManager.broadcast({ type: 'SYNC_STATE', state: { lastReactionStart: now, reactionResults: [] } });
  },

  kickPlayer: (playerId) => {
    const state = get();
    if (!state.isHost) return;
    
    const updatedPlayers = state.players.filter(p => p.id !== playerId);
    set({ players: updatedPlayers });
    networkManager.broadcast({ type: 'SYNC_STATE', state: { players: updatedPlayers } });
    networkManager.broadcast({ type: 'KICK_PLAYER', playerId });
  },

  resetGame: () => {
    const state = get();
    if (!state.isHost) return;
    
    const newState: Partial<GameState> = {
      deck: generateDeck(),
      discardPile: [],
      activeCard: null,
      phase: 'lobby',
      currentPlayerIndex: 0,
      kingsCount: 0,
      rules: [],
      reactionResults: [],
      stats: INITIAL_STATS,
      lastReactionStart: undefined
    };
    
    set(newState);
    networkManager.broadcast({ type: 'SYNC_STATE', state: newState });
  },

}));
