/* src/store/gameStore.ts */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import { GameState, Player, Card, Rank, Rule } from "../types";
import { networkManager } from "../network/NetworkManager";

/* ======================================================
   CONSTANTS
====================================================== */

const SMOKO_DURATION = 30_000;
const TURN_GAME_DURATION = 5_000;

/* ======================================================
   HELPERS
====================================================== */

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateDeck(): Card[] {
  const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  const deck: Card[] = [];

  for (const s of suits) {
    for (const r of ranks) {
      deck.push({
        id: uuidv4(),
        suit: s,
        rank: r,
        // Your Card type might include text/ruleTitle in some versions.
        // We keep only what YOU were generating here, since Card.tsx likely renders suit/rank.
      } as Card);
    }
  }

  return shuffle(deck);
}

/* ======================================================
   DRINK ENGINE (MATE GRAPH)
====================================================== */

function applyDrinkChain(state: GameState, startId: string, visited = new Set<string>()) {
  if (visited.has(startId)) return;

  visited.add(startId);

  const player = state.players.find((p) => p.id === startId);
  if (!player) return;

  player.drinks += 1;
  state.stats.totalDrinks += 1;

  const mates = player.mateIds ?? [];
  for (const mate of mates) {
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

  // Reaction
  reactionResults: [],
  lastReactionStart: undefined,
  reactionStarterId: undefined,

  // Turn game
  turnGame: {
    active: false,
    mode: "rhyme",
    prompt: "",
    currentIndex: 0,
    deadline: 0,
  },

  // Smoko
  smokoUntil: undefined,
  smokoCallerId: undefined,

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
   TIMERS (HOST ONLY)
====================================================== */

let smokoTimer: any = null;

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
    // Clients + host can apply SYNC_STATE patches, but only host broadcasts.
    set((st) => ({ ...st, ...s }));
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

    // Host handles inputs and broadcasts SYNC_STATE
    networkManager.onMessage((msg: any, senderPeerId?: string) => {
      const state = get();
      if (!state.isHost) {
        // Clients only apply SYNC_STATE; they do NOT process inputs.
        if (msg?.type === "SYNC_STATE") get().receiveState(msg.state);
        if (msg?.type === "KICK_PLAYER" && msg.playerId === get().myPlayerId) {
          window.location.reload();
        }
        return;
      }

      switch (msg?.type) {
        case "PLAYER_JOIN": {
          const incoming: Player = msg.player;

          // Prevent duplicates (reconnects)
          const exists = state.players.some((p) => p.id === incoming.id);
          if (exists) break;

          const newPlayer: Player = {
            ...incoming,
            peerId: senderPeerId ?? incoming.peerId,
            isHost: false,
            ready: true,
            drinks: 0,
            isQuestionMaster: false,
            hasThumbMaster: false,
            hasHeaven: false,
            mateIds: incoming.mateIds ?? [],
            smokoUsed: incoming.smokoUsed ?? false,
            cameraEnabled: true,
            micEnabled: true,
            activeSpeaker: false,
          };

          const nextPlayers = [...state.players, newPlayer];
          const patch: Partial<GameState> = { players: nextPlayers };

          set(patch);
          sync(patch);
          break;
        }

        case "DRAW_REQUEST": {
          if (state.phase !== "playing") break;
          if (state.smokoUntil) break;

          const current = state.players[state.currentPlayerIndex];
          if (current?.id !== msg.playerId) break;

          get().drawCard();
          break;
        }

        case "REACTION_TAP": {
          // Host records taps
          if (state.phase !== "reaction") break;
          if (!state.lastReactionStart) break;
          if (state.smokoUntil) break;

          const tapperId = msg.playerId as string;
          const time = msg.time as number;

          // Starter excluded from losing race
          if (tapperId === state.reactionStarterId) break;

          // Prevent double taps
          const already = state.reactionResults.some((r) => r.playerId === tapperId);
          if (already) break;

          const diff = Math.max(0, time - state.lastReactionStart);

          const result = { playerId: tapperId, time: diff, rank: 0 };
          const results = [...state.reactionResults, result]
            .sort((a, b) => a.time - b.time)
            .map((r, i) => ({ ...r, rank: i + 1 }));

          const patch: Partial<GameState> = { reactionResults: results };
          set(patch);
          sync(patch);

          // Everyone except starter taps => resolve loser
          const expected = state.players.length - 1;
          if (results.length >= expected) {
            const loser = results[results.length - 1];

            const copy = structuredClone(get()) as GameState;
            applyDrinkChain(copy, loser.playerId);

            // End reaction
            copy.phase = "playing";
            copy.reactionResults = [];
            copy.lastReactionStart = undefined;
            copy.reactionStarterId = undefined;

            set(copy as any);
            sync(copy);
          }

          break;
        }

        case "GOTCHA": {
          // Host applies gotcha
          if (state.smokoUntil) break;
          get().gotcha(msg.targetId);
          break;
        }

        case "MATE_ADD": {
          // Host adds mate relationship
          if (state.smokoUntil) break;

          const fromId = msg.fromId as string;
          const targetId = msg.targetId as string;

          const copy = structuredClone(get()) as GameState;
          const from = copy.players.find((p) => p.id === fromId);
          if (!from) break;

          const arr = from.mateIds ?? [];
          // avoid duplicates + self
          if (targetId && targetId !== fromId && !arr.includes(targetId)) {
            from.mateIds = [...arr, targetId];
          }

          set(copy as any);
          sync(copy);
          break;
        }

        case "SMOKO_REQUEST": {
          // Host starts smoko if caller hasn't used it
          if (state.smokoUntil) break;

          const callerId = msg.playerId as string;
          const caller = state.players.find((p) => p.id === callerId);
          if (!caller || caller.smokoUsed) break;

          const copy = structuredClone(get()) as GameState;

          // mark used
          const p = copy.players.find((x) => x.id === callerId);
          if (!p) break;
          p.smokoUsed = true;

          const until = Date.now() + SMOKO_DURATION;
          copy.phase = "paused" as any;
          copy.smokoUntil = until;
          copy.smokoCallerId = callerId;

          set(copy as any);
          sync(copy);

          // clear existing timer
          if (smokoTimer) clearTimeout(smokoTimer);
          smokoTimer = setTimeout(() => {
            const s2 = useGameStore.getState();
            if (!s2.isHost) return;

            const after = structuredClone(useGameStore.getState()) as any;
            after.phase = "playing";
            after.smokoUntil = undefined;
            after.smokoCallerId = undefined;

            useGameStore.setState(after);
            sync(after);

            smokoTimer = null;
          }, SMOKO_DURATION);

          break;
        }

        case "SYNC_STATE": {
          // Host shouldn't normally receive SYNC_STATE, but tolerate it
          break;
        }

        default:
          break;
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

    // Client sends join request
    networkManager.sendToHost({
      type: "PLAYER_JOIN",
      player,
    });

    // Client listens for SYNC_STATE + kick
    networkManager.onMessage((msg: any) => {
      if (msg?.type === "SYNC_STATE") {
        get().receiveState(msg.state);
      }
      if (msg?.type === "KICK_PLAYER" && msg.playerId === get().myPlayerId) {
        window.location.reload();
      }
    });
  },

  /* ======================================================
     GAME FLOW
  ====================================================== */

  startGame: () => {
    if (!get().isHost) return;

    // Clear smoko timer on new game
    if (smokoTimer) clearTimeout(smokoTimer);
    smokoTimer = null;

    const state = get();

    const nextPlayers = state.players.map((p) => ({
      ...p,
      drinks: 0,
      isQuestionMaster: false,
      hasThumbMaster: false,
      hasHeaven: false,
      mateIds: p.mateIds ?? [],
      smokoUsed: false,
      ready: true,
    }));

    const next: Partial<GameState> = {
      phase: "playing",

      deck: generateDeck(),
      discardPile: [],

      activeCard: null,

      currentPlayerIndex: 0,
      kingsCount: 0,

      rules: [],

      availableRulePool: shuffle(MASTER_RULE_POOL).slice(0, 10),

      reactionResults: [],
      lastReactionStart: undefined,
      reactionStarterId: undefined,

      turnGame: {
        active: false,
        mode: "rhyme",
        prompt: "",
        currentIndex: 0,
        deadline: 0,
      },

      smokoUntil: undefined,
      smokoCallerId: undefined,

      stats: {
        totalDrinks: 0,
        cardsDrawn: 0,
        reactionsTriggered: 0,
        gotchas: 0,
      },

      players: nextPlayers,
    };

    set(next);
    sync(next);
  },

  /* ======================================================
     CARD DRAW
  ====================================================== */

  drawCard: () => {
    const state = get();

    // Frozen engine during smoko
    if (state.smokoUntil) return;

    if (!state.isHost) {
      networkManager.sendToHost({
        type: "DRAW_REQUEST",
        playerId: state.myPlayerId,
      });
      return;
    }

    if (state.phase !== "playing") return;

    if (!state.deck.length) {
      const over: Partial<GameState> = { phase: "gameover" as any };
      set(over);
      sync(over);
      return;
    }

    const card = state.deck[0];
    const deck = state.deck.slice(1);
    const discardPile = [card, ...state.discardPile];

    const current = state.players[state.currentPlayerIndex];

    const nextIndex =
      (state.currentPlayerIndex + state.turnDirection + state.players.length) % state.players.length;

    // Build ONE authoritative next state (no double-sync)
    const copy = structuredClone(get()) as GameState;

    copy.deck = deck;
    copy.discardPile = discardPile;
    copy.activeCard = card;
    copy.currentPlayerIndex = nextIndex;

    resolveCardInPlace(copy, card, current.id);

    // End when deck empty (your rule)
    if (copy.deck.length === 0) {
      copy.phase = "gameover" as any;
    }

    set(copy as any);
    sync(copy);
  },

  /* ======================================================
     REACTION
  ====================================================== */

  triggerReaction: () => {
    const state = get();
    if (!state.isHost) return;
    if (state.smokoUntil) return;
    if (state.phase !== "playing") return;

    const now = Date.now();

    const next: Partial<GameState> = {
      phase: "reaction" as any,
      lastReactionStart: now,
      reactionStarterId: state.myPlayerId,
      reactionResults: [],
      stats: {
        ...state.stats,
        reactionsTriggered: state.stats.reactionsTriggered + 1,
      },
    };

    set(next);
    sync(next);
  },

  tapReaction: () => {
    const state = get();
    if (state.smokoUntil) return;
    if (state.phase !== "reaction") return;
    if (!state.lastReactionStart) return;

    // Starter excluded
    if (state.myPlayerId === state.reactionStarterId) return;

    networkManager.sendToHost({
      type: "REACTION_TAP",
      playerId: state.myPlayerId,
      time: Date.now(),
    });
  },

  /* ======================================================
     Q GOTCHA
  ====================================================== */

  gotcha: (targetId) => {
    // Host only
    if (!get().isHost) {
      networkManager.sendToHost({ type: "GOTCHA", targetId });
      return;
    }

    const state = get();
    if (state.smokoUntil) return;

    const copy = structuredClone(get()) as GameState;
    applyDrinkChain(copy, targetId);
    copy.stats.gotchas += 1;

    set(copy as any);
    sync(copy);
  },

  /* ======================================================
     MATE (8)
  ====================================================== */

  addMate: (targetId) => {
    const state = get();
    if (state.smokoUntil) return;

    // Client requests; Host applies
    if (!state.isHost) {
      networkManager.sendToHost({
        type: "MATE_ADD",
        fromId: state.myPlayerId,
        targetId,
      });
      return;
    }

    const copy = structuredClone(get()) as GameState;
    const me = copy.players.find((p) => p.id === copy.myPlayerId);
    if (!me) return;

    const arr = me.mateIds ?? [];
    if (targetId && targetId !== me.id && !arr.includes(targetId)) {
      me.mateIds = [...arr, targetId];
    }

    set(copy as any);
    sync(copy);
  },

  /* ======================================================
     SMOKO
  ====================================================== */

  triggerSmoko: () => {
    const state = get();

    // If already active, ignore
    if (state.smokoUntil) return;

    const me = state.players.find((p) => p.id === state.myPlayerId);
    if (!me || me.smokoUsed) return;

    // Client requests; Host starts
    if (!state.isHost) {
      networkManager.sendToHost({
        type: "SMOKO_REQUEST",
        playerId: state.myPlayerId,
      });
      return;
    }

    // Host starts locally
    networkManager.broadcast({
      type: "SMOKO_REQUEST",
      playerId: state.myPlayerId,
    });
  },
}));

/* ======================================================
   CARD RESOLVER (IN PLACE, HOST ONLY)
====================================================== */

function resolveCardInPlace(state: GameState, card: Card, drawerId: string) {
  const rank = card.rank;

  // Count cards drawn (always)
  state.stats.cardsDrawn += 1;

  /* A — Waterfall (UI/manual timer later) */
  if (rank === "A") {
    return;
  }

  /* 2 — You (targeting UI later) */
  if (rank === "2") {
    return;
  }

  /* 3 — Me */
  if (rank === "3") {
    applyDrinkChain(state, drawerId);
    return;
  }

  /* 4 — Whores (women drink) — needs gender flags later */
  if (rank === "4") {
    return;
  }

  /* 5 — Dicks (men drink) */
  if (rank === "5") {
    return;
  }

  /* 6 — Everyone (+ mate chain rules apply via applyDrinkChain) */
  if (rank === "6") {
    for (const p of state.players) {
      applyDrinkChain(state, p.id);
    }
    return;
  }

  /* 7 — Heaven holder */
  if (rank === "7") {
    state.players.forEach((p) => (p.hasHeaven = false));
    const drawer = state.players.find((p) => p.id === drawerId);
    if (drawer) drawer.hasHeaven = true;
    return;
  }

  /* 8 — Mate handled in UI (MatePicker calls addMate) */
  if (rank === "8") {
    return;
  }

  /* 9 / 10 — Turn Game (5s timer) */
  if (rank === "9" || rank === "10") {
    state.turnGame = {
      active: true,
      mode: rank === "9" ? "rhyme" : "category",
      prompt: "",
      currentIndex: state.currentPlayerIndex,
      deadline: Date.now() + TURN_GAME_DURATION,
    };

    state.phase = "turngame" as any;
    return;
  }

  /* J — Thumb master */
  if (rank === "J") {
    state.players.forEach((p) => (p.hasThumbMaster = false));
    const drawer = state.players.find((p) => p.id === drawerId);
    if (drawer) drawer.hasThumbMaster = true;
    return;
  }

  /* Q — Question master */
  if (rank === "Q") {
    state.players.forEach((p) => (p.isQuestionMaster = false));
    const drawer = state.players.find((p) => p.id === drawerId);
    if (drawer) drawer.isQuestionMaster = true;
    return;
  }

  /* K — Add a random rule from pool */
  if (rank === "K") {
    state.kingsCount += 1;

    const rule = state.availableRulePool.shift();
    if (rule) state.rules.push(rule);

    return;
  }
}

/* ======================================================
   SYNC (HOST ONLY BROADCAST)
====================================================== */

function sync(statePatchOrFull: Partial<GameState> | GameState) {
  // Always broadcast the FULL public state so clients stay aligned.
  const full = { ...useGameStore.getState(), ...(statePatchOrFull as any) };

  networkManager.broadcast({
    type: "SYNC_STATE",
    state: full,
  });
}
