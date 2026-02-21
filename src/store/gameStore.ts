import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import { GameState, Player, GameStats, Rank } from "../types";
import { generateDeck } from "../constants";
import { networkManager } from "../network/NetworkManager";

/* ======================================================
   TYPES
====================================================== */

interface GameStore extends GameState {
  myPlayerId: string;
  isHost: boolean;

  /* Room */
  createRoom: (name: string) => Promise<string>;
  joinRoom: (roomId: string, name: string) => Promise<void>;

  /* Lobby */
  setMyReady: (ready: boolean) => void;

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
  roomId: "",
  players: [],
  deck: [],
  discardPile: [],
  activeCard: null,

  phase: "lobby",

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

  myPlayerId: "",
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
    networkManager.onMessage((msg, senderPeerId) => {
      const state = get();
      if (!state.isHost) return;

      switch (msg.type) {
        case "PLAYER_JOIN": {
          // Avoid duplicates (refresh / reconnect edge cases)
          const exists = state.players.some((p) => p.id === msg.player.id);
          if (exists) {
            // Still sync current state to that peer
            broadcastStateSnapshot();
            return;
          }

          const newPlayer: Player = {
            ...msg.player,
            peerId: senderPeerId,
          };

          const players = [...state.players, newPlayer];
          set({ players });

          broadcastStateSnapshot();
          return;
        }

        case "PLAYER_READY": {
          const { playerId, ready } = msg;

          const players = state.players.map((p) =>
            p.id === playerId ? { ...p, ready: !!ready } : p
          );

          set({ players });
          broadcastStateSnapshot();
          return;
        }

        case "DRAW_REQUEST": {
          if (state.phase !== "playing") return;

          const current = state.players[state.currentPlayerIndex];
          if (current?.id === msg.playerId) {
            get().drawCard();
          }
          return;
        }

        case "REACTION_TAP": {
          handleReactionTap(msg);
          return;
        }
      }
    });

    // Host immediately broadcasts initial snapshot (helps late listeners)
    broadcastStateSnapshot();

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
      type: "PLAYER_JOIN",
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
      if (msg.type === "SYNC_STATE") {
        get().receiveState(msg.state);
      }

      if (msg.type === "KICK_PLAYER") {
        if (msg.playerId === get().myPlayerId) {
          window.location.reload();
        }
      }
    });

    // Ask host for snapshot (in case join races listener timing)
    networkManager.sendToHost({ type: "REQUEST_SYNC" });
  },

  receiveState: (state) => {
    set((s) => ({ ...s, ...state }));
  },

  /* ======================================================
     LOBBY
  ====================================================== */

  setMyReady: (ready) => {
    const state = get();

    // Host updates locally and rebroadcasts
    if (state.isHost) {
      const players = state.players.map((p) =>
        p.id === state.myPlayerId ? { ...p, ready: !!ready } : p
      );

      set({ players });
      broadcastStateSnapshot();
      return;
    }

    // Client requests host update
    networkManager.sendToHost({
      type: "PLAYER_READY",
      playerId: state.myPlayerId,
      ready: !!ready,
    });
  },

  /* ======================================================
     FLOW
  ====================================================== */

  startGame: () => {
    const state = get();
    if (!state.isHost) return;

    const next: Partial<GameState> = {
      phase: "playing",

      deck: generateDeck(),
      discardPile: [],
      activeCard: null,

      currentPlayerIndex: 0,
      kingsCount: 0,

      rules: [],
      reactionResults: [],
      lastReactionStart: undefined,

      stats: INITIAL_STATS,
    };

    set(next);
    broadcastStateSnapshot();
  },

  resetGame: () => {
    const state = get();
    if (!state.isHost) return;

    const next: Partial<GameState> = {
      ...INITIAL_STATE,
      roomId: state.roomId,
      players: state.players.map((p) => ({
        ...p,
        // Reset per-round toggles cleanly
        drinks: 0,
        isQuestionMaster: false,
        hasThumbMaster: false,
        hasHeaven: false,
      })),
    };

    set(next);
    broadcastStateSnapshot();
  },

  /* ======================================================
     GAMEPLAY
  ====================================================== */

  drawCard: () => {
    const state = get();

    /* Client → Host */
    if (!state.isHost) {
      networkManager.sendToHost({
        type: "DRAW_REQUEST",
        playerId: state.myPlayerId,
      });
      return;
    }

    if (!state.deck.length) return;

    const card = state.deck[0];
    const deck = state.deck.slice(1);
    const discardPile = [card, ...state.discardPile];

    let players = [...state.players];

    let kingsCount = state.kingsCount;
    let phase = state.phase;

    let thumbMasterId = state.thumbMasterId;
    let questionMasterId = state.questionMasterId;

    const current = players[state.currentPlayerIndex];

    const r: Rank = card.rank;

    if (r === "K") {
      kingsCount += 1;
      if (kingsCount >= 4) phase = "gameover";
    }

    if (r === "7") {
      players.forEach((p) => (p.hasHeaven = false));
      current.hasHeaven = true;
    }

    if (r === "J") {
      players.forEach((p) => (p.hasThumbMaster = false));
      current.hasThumbMaster = true;
      thumbMasterId = current.id;
    }

    if (r === "Q") {
      players.forEach((p) => (p.isQuestionMaster = false));
      current.isQuestionMaster = true;
      questionMasterId = current.id;
    }

    const nextIndex =
      (state.currentPlayerIndex + state.turnDirection + players.length) %
      players.length;

    const next: Partial<GameState> = {
      deck,
      discardPile,
      activeCard: card,

      players,
      currentPlayerIndex: nextIndex,

      kingsCount,
      phase,

      thumbMasterId,
      questionMasterId,

      stats: {
        ...state.stats,
        cardsDrawn: state.stats.cardsDrawn + 1,
      },
    };

    set(next);
    broadcastStateSnapshot();
  },

  /* ======================================================
     REACTIONS
  ====================================================== */

  triggerReaction: () => {
    const state = get();
    if (!state.isHost) return;

    const now = Date.now();

    set({
      lastReactionStart: now,
      reactionResults: [],
      stats: {
        ...state.stats,
        reactionsTriggered: state.stats.reactionsTriggered + 1,
      },
    });

    broadcastStateSnapshot();
  },

  tapReaction: () => {
    const state = get();
    if (!state.lastReactionStart) return;

    const time = Date.now();

    if (!state.isHost) {
      networkManager.sendToHost({
        type: "REACTION_TAP",
        playerId: state.myPlayerId,
        time,
      });
      return;
    }

    handleReactionTap({ playerId: state.myPlayerId, time });
  },

  resolveReaction: () => {
    const state = get();
    if (!state.isHost) return;

    setTimeout(() => {
      set({
        lastReactionStart: undefined,
        reactionResults: [],
      });

      broadcastStateSnapshot();
    }, 2500);
  },

  /* ======================================================
     MODIFIERS
  ====================================================== */

  updatePlayerStats: (playerId, drinks) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.map((p) =>
      p.id === playerId ? { ...p, drinks: p.drinks + drinks } : p
    );

    const stats = {
      ...state.stats,
      totalDrinks: state.stats.totalDrinks + drinks,
    };

    set({ players, stats });
    broadcastStateSnapshot();
  },

  makeRule: (text) => {
    const state = get();
    if (!state.isHost) return;

    const rule = {
      id: uuidv4(),
      text,
      createdBy: state.players[state.currentPlayerIndex]?.id ?? "host",
    };

    const rules = [...state.rules, rule];

    set({ rules });
    broadcastStateSnapshot();
  },

  setQuestionMaster: (id) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.map((p) => ({
      ...p,
      isQuestionMaster: p.id === id,
    }));

    set({ players, questionMasterId: id });
    broadcastStateSnapshot();
  },

  setThumbMaster: (id) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.map((p) => ({
      ...p,
      hasThumbMaster: p.id === id,
    }));

    set({ players, thumbMasterId: id });
    broadcastStateSnapshot();
  },

  /* ======================================================
     HOST
  ====================================================== */

  kickPlayer: (id) => {
    const state = get();
    if (!state.isHost) return;

    const players = state.players.filter((p) => p.id !== id);

    set({ players });
    broadcastStateSnapshot();

    networkManager.broadcast({
      type: "KICK_PLAYER",
      playerId: id,
    });
  },
}));

/* ======================================================
   SYNC HELPERS (CRITICAL: NO ACTIONS!)
====================================================== */

function snapshotGameState(): GameState {
  const s = useGameStore.getState();

  // IMPORTANT: only GameState fields, never Zustand actions/functions.
  return {
    roomId: s.roomId,
    players: s.players,

    deck: s.deck,
    discardPile: s.discardPile,
    activeCard: s.activeCard,

    phase: s.phase,

    currentPlayerIndex: s.currentPlayerIndex,
    turnDirection: s.turnDirection,

    kingsCount: s.kingsCount,

    rules: s.rules,

    reactionResults: s.reactionResults,
    lastReactionStart: s.lastReactionStart,

    stats: s.stats,

    thumbMasterId: s.thumbMasterId,
    questionMasterId: s.questionMasterId,
  };
}

function broadcastStateSnapshot() {
  const state = snapshotGameState();

  networkManager.broadcast({
    type: "SYNC_STATE",
    state,
  });
}

function handleReactionTap(msg: { playerId: string; time: number }) {
  const state = useGameStore.getState();
  if (!state.isHost) return;
  if (!state.lastReactionStart) return;

  // Prevent double taps for the same player
  if (state.reactionResults.some((r) => r.playerId === msg.playerId)) return;

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

  useGameStore.setState({ reactionResults: results });
  broadcastStateSnapshot();

  if (results.length === state.players.length) {
    useGameStore.getState().resolveReaction();
  }
     }
