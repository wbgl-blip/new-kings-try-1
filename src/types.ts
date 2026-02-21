/* src/types.ts */

/* ======================================================
   CARDS
====================================================== */

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;

  text: string;
  ruleTitle: string;
}

/* ======================================================
   PLAYERS
====================================================== */

export interface Player {
  id: string;
  name: string;

  peerId: string;

  isHost: boolean;
  ready: boolean;

  drinks: number;

  /* Powers */
  isQuestionMaster: boolean;
  hasThumbMaster: boolean;
  hasHeaven: boolean;

  /* Mate (8) */
  mateId?: string;

  /* Media (local only) */
  stream?: MediaStream;
  cameraEnabled: boolean;
  micEnabled: boolean;
  activeSpeaker: boolean;

  /* Reactions */
  lastReactionTime?: number;
}

/* ======================================================
   GAME FLOW
====================================================== */

export type GamePhase =
  | "lobby"
  | "playing"
  | "paused"
  | "gameover";

/* ======================================================
   RULES
====================================================== */

export interface Rule {
  id: string;
  text: string;
  createdBy: string;
}

/* ======================================================
   REACTIONS
====================================================== */

export interface ReactionResult {
  playerId: string;
  time: number;
  rank: number;
}

/* ======================================================
   STATS
====================================================== */

export interface GameStats {
  totalDrinks: number;
  cardsDrawn: number;
  reactionsTriggered: number;
  gotchas: number;
}

/* ======================================================
   WATERFALL (ACE)
====================================================== */

export type WaterfallStatus =
  | "idle"
  | "waiting"
  | "running"
  | "stopping";

export interface WaterfallState {
  status: WaterfallStatus;

  startedBy?: string;

  duration?: number;
  startTime?: number;

  earlyStoppers: string[];
  finished: string[];
}

/* ======================================================
   GAME STATE
====================================================== */

export interface GameState {
  roomId: string;

  players: Player[];

  /* Cards */
  deck: Card[];
  discardPile: Card[];
  activeCard: Card | null;

  /* Flow */
  phase: GamePhase;

  currentPlayerIndex: number;
  turnDirection: 1 | -1;

  kingsCount: number;

  /* Rules */
  rules: Rule[];

  /* Reactions */
  lastReactionStart?: number;
  reactionResults: ReactionResult[];

  /* Power Owners */
  thumbMasterId?: string;
  questionMasterId?: string;
  heavenHolderId?: string;

  /* Mate Links */
  mates: Record<string, string>; // playerId -> mateId

  /* Stats */
  stats: GameStats;

  /* Outcomes */
  winnerId?: string;
  loserId?: string;

  /* Effects */
  waterfall: WaterfallState;
}

/* ======================================================
   NETWORK
====================================================== */

export type NetworkMessage =
  | {
      type: "SYNC_STATE";
      state: Partial<GameState>;
    }
  | {
      type: "PLAYER_JOIN";
      player: Omit<Player, "stream">;
    }
  | {
      type: "PLAYER_LEAVE";
      playerId: string;
    }
  | {
      type: "KICK_PLAYER";
      playerId: string;
    }
  | {
      type: "HOST_MIGRATE";
      newHostId: string;
    }
  | {
      type: "REACTION_TAP";
      playerId: string;
      time: number;
    }
  | {
      type: "MEDIA_STATE";
      playerId: string;
      camera: boolean;
      mic: boolean;
    }
  | {
      type: "TOAST";
      message: string;
      variant?: "info" | "error" | "success";
    }
  | {
      type: "DRAW_REQUEST";
      playerId: string;
    }
  | {
      type: "PLAYER_READY";
      playerId: string;
      ready: boolean;
    }
  | {
      type: "REQUEST_SYNC";
    };
