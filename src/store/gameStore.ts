/* src/store/gameStore.ts */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import {
  GameState,
  Player,
  Card,
  Rank,
  Rule,
} from "../types";

import { networkManager } from "../network/NetworkManager";

/* ======================================================
   CONSTANTS
====================================================== */

const SMOKO_DURATION = 30_000;

/* ======================================================
   HELPERS
====================================================== */

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateDeck(): Card[] {
  const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
  const ranks: Rank[] = [
    "A","2","3","4","5","6","7","8","9","10","J","Q","K"
  ];

  const deck: Card[] = [];

  for (const s of suits) {
    for (const r of ranks) {
      deck.push({
        id: uuidv4(),
        suit: s,
        rank: r,
      });
    }
  }

  return shuffle(deck);
}

/* ======================================================
   DRINK ENGINE (MATE GRAPH)
====================================================== */

function applyDrinkChain(
  state: GameState,
  startId: string,
  visited = new Set<string>()
) {
  if (visited.has(startId)) return;

  visited.add(startId);

  const player = state.players.find(p => p.id === startId);
  if (!player) return;

  player.drinks += 1;
  state.stats.totalDrinks += 1;

  for (const mate of player.mateIds) {
    applyDrinkChain(state, mate, visited);
  }
}

/* ======================================================
   RULE POOL
====================================================== */

const MASTER_RULE_POOL: Rule[] = [
  { id: "1", title: "No Names", text: "No saying names" },
  { id: "2", title: "Left Hand", text: "Left hand only" },
  { id: "3", title: "British", text: "British accent" },
  { id: "4", title: "No Phone", text: "No phones" },
  { id: "5", title: "Whisper", text: "Whisper only" },
  { id: "6", title: "Roast", text: "Roast before drink" },
  { id: "7", title: "No Laugh", text: "No laughing" },
  { id: "8", title: "No Point", text: "No pointing" },
  { id: "9", title: "Narrate", text: "Narrate drinks" },
  { id: "10", title: "Cheers", text: "Cheers every sip" },
  // Add more later
];

/* ======================================================
   INITIAL STATE
====================================================== */

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
  availableRulePool: [],

  reactionResults: [],

  turnGame: {
    active: false,
    mode: "rhyme",
    prompt: "",
    currentIndex: 0,
    deadline: 0,
  },

  stats: {
    totalDrinks: 0,
    cardsDrawn: 0,
    reactionsTriggered: 0,
    gotchas: 0,
  },
};

/* ======================================================
   STORE
====================================================== */

interface GameStore extends GameState {
  myPlayerId: string;
  isHost: boolean;

  createRoom(name: string): Promise<string>;
  joinRoom(id: string, name: string): Promise<void>;

  startGame(): void;

  drawCard(): void;

  triggerReaction(): void;
  tapReaction(): void;

  gotcha(targetId: string): void;

  addMate(targetId: string): void;

  triggerSmoko(): void;

  receiveState(state: Partial<GameState>): void;
}

/* ======================================================
   STORE
====================================================== */

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,

  myPlayerId: "",
  isHost: false,

  /* ======================================================
     NETWORK
  ====================================================== */

  receiveState: (s) => {
    set(st => ({ ...st, ...s }));
  },

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

      mateIds: [],
      smokoUsed: false,

      cameraEnabled: true,
      micEnabled: true,
      activeSpeaker: false,
    };

    const rulePool = shuffle(MASTER_RULE_POOL).slice(0, 10);

    set({
      roomId: peerId,
      myPlayerId: id,
      isHost: true,

      players: [host],

      deck: generateDeck(),

      availableRulePool: rulePool,
    });

    networkManager.onMessage((msg) => {
      if (msg.type === "SYNC_STATE") {
        get().receiveState(msg.state);
      }

      if (msg.type === "REACTION_TAP") {
        get().tapReaction();
      }

      if (msg.type === "SMOKO_TRIGGER") {
        get().triggerSmoko();
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

    const player: Player = {
      id,
      name,
      peerId,

      isHost: false,
      ready: true,

      drinks: 0,

      isQuestionMaster: false,
      hasThumbMaster: false,
      hasHeaven: false,

      mateIds: [],
      smokoUsed: false,

      cameraEnabled: true,
      micEnabled: true,
      activeSpeaker: false,
    };

    networkManager.sendToHost({
      type: "PLAYER_JOIN",
      player,
    });
  },

  /* ======================================================
     GAME FLOW
  ====================================================== */

  startGame: () => {
    if (!get().isHost) return;

    const next: Partial<GameState> = {
      phase: "playing",
      deck: generateDeck(),
      discardPile: [],
      currentPlayerIndex: 0,
      kingsCount: 0,
      rules: [],
    };

    set(next);
    sync(next);
  },

  /* ======================================================
     CARD DRAW
  ====================================================== */

  drawCard: () => {
    const state = get();

    if (!state.isHost) {
      networkManager.sendToHost({
        type: "DRAW_REQUEST",
        playerId: state.myPlayerId,
      });
      return;
    }

    if (!state.deck.length) {
      set({ phase: "gameover" });
      return;
    }

    const card = state.deck[0];
    const deck = state.deck.slice(1);

    const discard = [card, ...state.discardPile];

    const current =
      state.players[state.currentPlayerIndex];

    const nextIndex =
      (state.currentPlayerIndex +
        state.turnDirection +
        state.players.length) %
      state.players.length;

    const next: Partial<GameState> = {
      deck,
      discardPile: discard,
      activeCard: card,
      currentPlayerIndex: nextIndex,
    };

    resolveCard(state, card, current.id);

    set(next);
    sync(next);
  },

  /* ======================================================
     REACTION
  ====================================================== */

  triggerReaction: () => {
    if (!get().isHost) return;

    const now = Date.now();

    const next = {
      phase: "reaction" as const,
      lastReactionStart: now,
      reactionStarterId: get().myPlayerId,
      reactionResults: [],
    };

    set(next);
    sync(next);
  },

  tapReaction: () => {
    const state = get();

    if (!state.lastReactionStart) return;

    if (state.myPlayerId === state.reactionStarterId)
      return;

    const diff = Date.now() - state.lastReactionStart;

    const result = {
      playerId: state.myPlayerId,
      time: diff,
      rank: 0,
    };

    const results = [...state.reactionResults, result]
      .sort((a, b) => a.time - b.time)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    set({ reactionResults: results });

    sync({ reactionResults: results });

    if (
      results.length ===
      state.players.length - 1
    ) {
      const loser =
        results[results.length - 1];

      const copy = structuredClone(state);

      applyDrinkChain(copy, loser.playerId);

      set({
        phase: "playing",
        reactionResults: [],
        lastReactionStart: undefined,
      });

      sync(copy);
    }
  },

  /* ======================================================
     Q GOTCHA
  ====================================================== */

  gotcha: (id) => {
    if (!get().isHost) return;

    const copy = structuredClone(get());

    applyDrinkChain(copy, id);

    copy.stats.gotchas += 1;

    set(copy);
    sync(copy);
  },

  /* ======================================================
     MATE (8)
  ====================================================== */

  addMate: (targetId) => {
    const copy = structuredClone(get());

    const me = copy.players.find(
      p => p.id === copy.myPlayerId
    );

    if (!me) return;

    me.mateIds.push(targetId);

    set(copy);
    sync(copy);
  },

  /* ======================================================
     SMOKO
  ====================================================== */

  triggerSmoko: () => {
    const state = get();

    const me = state.players.find(
      p => p.id === state.myPlayerId
    );

    if (!me || me.smokoUsed) return;

    me.smokoUsed = true;

    const until = Date.now() + SMOKO_DURATION;

    const next = {
      phase: "paused" as const,
      smokoUntil: until,
    };

    set(next);
    sync(next);

    setTimeout(() => {
      set({ phase: "playing", smokoUntil: undefined });
      sync({ phase: "playing", smokoUntil: undefined });
    }, SMOKO_DURATION);
  },
}));

/* ======================================================
   CARD RESOLVER
====================================================== */

function resolveCard(
  state: GameState,
  card: Card,
  drawerId: string
) {
  const copy = structuredClone(state);

  const rank = card.rank;

  /* A — Waterfall (manual UI later) */
  if (rank === "A") return;

  /* 2 — You */
  if (rank === "2") return;

  /* 3 — Me */
  if (rank === "3") {
    applyDrinkChain(copy, drawerId);
  }

  /* 4 — Women (manual flag later) */
  if (rank === "4") return;

  /* 5 — Men */
  if (rank === "5") return;

  /* 6 — Everyone */
  if (rank === "6") {
    for (const p of copy.players) {
      applyDrinkChain(copy, p.id);
    }
  }

  /* 7 — Heaven */
  if (rank === "7") {
    copy.players.forEach(p => (p.hasHeaven = false));
    const me = copy.players.find(p => p.id === drawerId);
    if (me) me.hasHeaven = true;
  }

  /* 8 — Mate handled in UI */

  /* 9 / 10 — Turn Game */
  if (rank === "9" || rank === "10") {
    copy.turnGame = {
      active: true,
      mode: rank === "9" ? "rhyme" : "category",
      prompt: "",
      currentIndex: copy.currentPlayerIndex,
      deadline: Date.now() + 5000,
    };

    copy.phase = "turngame";
  }

  /* J — Thumb */
  if (rank === "J") {
    copy.players.forEach(p => (p.hasThumbMaster = false));
    const me = copy.players.find(p => p.id === drawerId);
    if (me) me.hasThumbMaster = true;
  }

  /* Q — Question Master */
  if (rank === "Q") {
    copy.players.forEach(p => (p.isQuestionMaster = false));
    const me = copy.players.find(p => p.id === drawerId);
    if (me) me.isQuestionMaster = true;
  }

  /* K — Rule */
  if (rank === "K" && copy.rules.length < 4) {
    const rule = copy.availableRulePool.shift();
    if (rule) copy.rules.push(rule);
  }

  copy.stats.cardsDrawn += 1;

  useGameStore.setState(copy);
  sync(copy);
}

/* ======================================================
   SYNC
====================================================== */

function sync(state: Partial<GameState>) {
  const full = { ...useGameStore.getState(), ...state };

  networkManager.broadcast({
    type: "SYNC_STATE",
    state: full,
  });
}
