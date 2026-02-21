import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

import { GameState, Player, GameStats, Rank } from '../types';
import { generateDeck } from '../constants';
import { networkManager } from '../network/NetworkManager';

/* ======================================================
   TYPES
====================================================== */

interface GameStore extends GameState {
  myPlayerId: string;
  isHost: boolean;

  /* Room */
  createRoom: (name: string) => Promise<string>;
  joinRoom: (roomId: string, name: string) => Promise<void>;

  /* Flow */
  startGame: () => void;
  resetGame: () => void;

  /* Gameplay */
  drawCard: () => void;

  /* Reactions */
  triggerReaction: () => void;
  tapReaction: () => void;
  resolveReaction: () => void;

  /* Modifiers */
  updatePlayerStats: (playerId: string, drinks: number) => void;
  makeRule: (text: string) => void;

  setQuestionMaster: (id: string) => void;
  setThumbMaster: (id: string) => void;

  /* Host */
  kickPlayer: (id: string) => void;

  /* Sync */
  receiveState: (state: Partial<GameState>) => void;
}

/* ======================================================
   INITIALS
====================================================== */

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
  turnDirection: 1,

  kingsCount: 0,

  rules: [],
  reactionResults: [],
  lastReactionStart: undefined,

  stats: INITIAL_STATS,

  thumbMasterId: undefined,
  questionMasterId: undefined,
};

/* ======================================================
   STORE
====================================================== */

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,

  myPlayerId: '',
  isHost: false,

  /* ======================================================
     ROOM
  ====================================================== */

  createRoom: async (name) => {
    const peerId = await networkManager.initialize();
    const id = uuidv4();

    const host: Player = {
      id,
      name,
      peerId,

      isHost: true,
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
      myPlayerId: id,
      isHost: true,
      players: [host],
      deck: generateDeck(),
    });

    /* Host listens for all messages */
    networkManager.onMessage((msg, senderId) => {
      const state = get();
      if (!state.isHost) return;

      switch (msg.type) {
        case 'PLAYER_JOIN': {
          const newPlayer: Player = {
            ...msg.player,
            peerId: senderId,
          };

          const players = [...state.players, newPlayer];

          set({ players });
          syncState({ players });

          break;
        }

        case 'DRAW_REQUEST': {
          if (state.phase !== 'playing') return;

          const current =
            state.players[state.currentPlayerIndex];

          if (current?.id === msg.playerId) {
            get().drawCard();
          }

          break;
        }

        case 'REACTION_TAP': {
          handleReactionTap(msg);
          break;
        }
      }
    });

    return peerId;
  },

  joinRoom: async (roomId, name) => {
    const peerId = await networkManager.initialize();
    const id = uuidv4();

    set({
      roomId,
      myPlayerId: id,
      isHost: false,
    });

    await networkManager.connectToHost(roomId);

    networkManager.sendToHost({
      type: 'PLAYER_JOIN',
      player: {
        id,
        name,
        peerId,

        isHost: false,
        ready: true,

        drinks: 0,

        isQuestionMaster: false,
        hasThumbMaster: false,
        hasHeaven: false,

        cameraEnabled: true,
        micEnabled: true,
        activeSpeaker: false,
      },
    });

    networkManager.onMessage((msg) => {
      if (msg.type === 'SYNC_STATE') {
        get().receiveState(msg.state);
      }

      if (msg.type === 'KICK_PLAYER') {
        if (msg.playerId === get().myPlayerId) {
          window.location.reload();
        }
      }
    });
  },

  receiveState: (state) => {
    set((s) => ({ ...s, ...state }));
  },

  /* ======================================================
     FLOW
  ====================================================== */

  startGame: () => {
    const state = get();
    if (!state.isHost) return;

    const next: Partial<GameState> = {
      phase: 'playing',

      deck: generateDeck(),
      discardPile: [],

      currentPlayerIndex: 0,
      kingsCount: 0,

      rules: [],
      reactionResults: [],
      lastReactionStart: undefined,

      stats: INITIAL_STATS,
    };

    set(next);
    syncState(next);
  },

  resetGame: () => {
    const state = get();
    if (!state.isHost) return;

    const next: Partial<GameState> = {
      ...INITIAL_STATE,
      roomId: state.roomId,
      players: state.players,
    };

    set(next);
    syncState(next);
  },

  /* ======================================================
     GAMEPLAY
  ====================================================== */

  drawCard: () => {
    const state = get();

    /* Client → Host */
    if (!state.isHost) {
      networkManager.sendToHost({
        type: 'DRAW_REQUEST',
        playerId: state.myPlayerId,
      });

      return;
    }

    if (!state.deck.length) return;

    const card = state.deck[0];
    const deck = state.deck.slice(1);
    const discard = [card, ...state.discardPile];

    let players = [...state.players];

    let kings = state.kingsCount;
    let phase = state.phase;

    let thumb = state.thumbMasterId;
    let question = state.questionMasterId;

    const current = players[state.currentPlayerIndex];

    /* Rules */
    const r: Rank = card.rank;

    if (r === 'K') {
      kings++;

      if (kings >= 4) {
        phase = 'gameover';
      }
    }

    if (r === '7') {
      players.forEach((p) => (p.hasHeaven = false));
      current.hasHeaven = true;
    }

    if (r === 'J') {
      players.forEach((p) => (p.hasThumbMaster = false));
      current.hasThumbMaster = true;
      thumb = current.id;
    }

    if (r === 'Q') {
      players.forEach((p) => (p.isQuestionMaster = false));
      current.isQuestionMaster = true;
      question = current.id;
    }

    const nextIndex =
      (state.currentPlayerIndex +
        state.turnDirection +
        players.length) %
      players.length;

    const next: Partial<GameState> = {
      deck,
      discardPile: discard,

      activeCard: card,

      currentPlayerIndex: nextIndex,

      kingsCount: kings,
      phase,

      players,

      thumbMasterId: thumb,
      questionMasterId: question,

      stats: {
        ...state.stats,
        cardsDrawn: state.stats.cardsDrawn + 1,
      },
    };

    set(next);
    syncState(next);
  },

  /* ======================================================
     REACTIONS
  ====================================================== */

  triggerReaction: () => {
    const state = get();
    if (!state.isHost) return;

    const now = Date.now();

    const next = {
      lastReactionStart: now,
      reactionResults: [],
    };

    set(next);
    syncState(next);
  },

  tapReaction: () => {
    const state = get();

    if (!state.lastReactionStart) return;

    const time = Date.now();

    if (!state.isHost) {
      networkManager.sendToHost({
        type: 'REACTION_TAP',
        playerId: state.myPlayerId,
        time,
      });

      return;
    }

    handleReactionTap({
      playerId: state.myPlayerId,
      time,
    });
  },

  resolveReaction: () => {
    const state = get();
    if (!state.isHost) return;

    setTimeout(() => {
      const next = {
        lastReactionStart: undefined,
        reactionResults: [],
      };

      set(next);
      syncState(next);
    }, 2500);
  },

  /* ======================================================
     MODIFIERS
  ====================================================== */

  updatePlayerStats: (id, drinks) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.map((p) =>
      p.id === id
        ? { ...p, drinks: p.drinks + drinks }
        : p
    );

    const stats = {
      ...state.stats,
      totalDrinks: state.stats.totalDrinks + drinks,
    };

    set({ players, stats });
    syncState({ players, stats });
  },

  makeRule: (text) => {
    const state = get();
    if (!state.isHost) return;

    const rule = {
      id: uuidv4(),
      text,
      createdBy:
        state.players[state.currentPlayerIndex]?.id ??
        'host',
    };

    const rules = [...state.rules, rule];

    set({ rules });
    syncState({ rules });
  },

  setQuestionMaster: (id) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.map((p) => ({
      ...p,
      isQuestionMaster: p.id === id,
    }));

    set({ players, questionMasterId: id });
    syncState({ players, questionMasterId: id });
  },

  setThumbMaster: (id) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.map((p) => ({
      ...p,
      hasThumbMaster: p.id === id,
    }));

    set({ players, thumbMasterId: id });
    syncState({ players, thumbMasterId: id });
  },

  /* ======================================================
     HOST
  ====================================================== */

  kickPlayer: (id) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.filter(
      (p) => p.id !== id
    );

    set({ players });

    syncState({ players });

    networkManager.broadcast({
      type: 'KICK_PLAYER',
      playerId: id,
    });
  },
}));

/* ======================================================
   HELPERS
====================================================== */

function syncState(state: Partial<GameState>) {
  const full = { ...useGameStore.getState(), ...state };

  networkManager.broadcast({
    type: 'SYNC_STATE',
    state: full,
  });
}

function handleReactionTap(msg: {
  playerId: string;
  time: number;
}) {
  const state = useGameStore.getState();

  if (!state.lastReactionStart) return;

  const diff = msg.time - state.lastReactionStart;

  const result = {
    playerId: msg.playerId,
    time: diff,
    rank: 0,
  };

  const results = [...state.reactionResults, result].sort(
    (a, b) => a.time - b.time
  );

  results.forEach((r, i) => (r.rank = i + 1));

  useGameStore.setState({
    reactionResults: results,
  });

  syncState({ reactionResults: results });

  if (results.length === state.players.length) {
    useGameStore.getState().resolveReaction();
  }
}
