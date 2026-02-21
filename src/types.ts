/* src/types.ts */

/* ======================================================
   CARD
====================================================== */

export type Suit =
  | "hearts"
  | "diamonds"
  | "clubs"
  | "spades";

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
}

/* ======================================================
   PLAYER
====================================================== */

export interface Player {
  id: string;
  name: string;
  peerId: string;

  /* Host / Lobby */
  isHost: boolean;
  ready: boolean;

  /* Drinks */
  drinks: number;

  /* Roles */
  isQuestionMaster: boolean;
  hasThumbMaster: boolean;
  hasHeaven: boolean;

  /* Mates (directed graph) */
  mateIds: string[];

  /* Smoko */
  smokoUsed: boolean;

  /* Media */
  cameraEnabled: boolean;
  micEnabled: boolean;
  activeSpeaker: boolean;
}

/* ======================================================
   GAME PHASE
====================================================== */

export type GamePhase =
  | "lobby"
  | "playing"
  | "paused"
  | "reaction"
  | "turngame"
  | "gameover";

/* ======================================================
   RULES
====================================================== */

export interface Rule {
  id: string;
  title: string;
  text: string;
}

/* ======================================================
   REACTION
====================================================== */

export interface ReactionResult {
  playerId: string;
  time: number;
  rank: number;
}

/* ======================================================
   TURN GAME (9 / 10)
====================================================== */

export interface TurnGameState {
  active: boolean;

  mode: "rhyme" | "category";

  prompt: string;

  currentIndex: number;

  deadline: number;
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
   GAME STATE
====================================================== */

export interface GameState {
  /* Room */
  roomId: string;

  /* Players */
  players: Player[];

  /* Cards */
  deck: Card[];
  discardPile: Card[];

  activeCard: Card | null;

  /* Phase */
  phase: GamePhase;

  /* Turn */
  currentPlayerIndex: number;
  turnDirection: 1 | -1;

  /* Kings */
  kingsCount: number;

  /* Rules */
  rules: Rule[];
  availableRulePool: Rule[];

  /* Reaction */
  lastReactionStart?: number;
  reactionStarterId?: string;

  reactionResults: ReactionResult[];

  /* Turn Game */
  turnGame: TurnGameState;

  /* Question Master */
  questionMasterId?: string;

  /* Stats */
  stats: GameStats;

  /* Smoko */
  smokoUntil?: number;
  smokoById?: string;

  /* Results */
  winnerId?: string;
  loserId?: string;
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
      player: Player;
    }

  | {
      type: "KICK_PLAYER";
      playerId: string;
    }

  | {
      type: "REACTION_TAP";
      playerId: string;
      time: number;
    }

  | {
      type: "DRAW_REQUEST";
      playerId: string;
    }

  | {
      type: "GOTCHA";
      targetId: string;
    }

  | {
      type: "SMOKO_TRIGGER";
      playerId: string;
    };
