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

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  peerId: string; // PeerJS ID

  ready: boolean;
  drinks: number;

  isQuestionMaster: boolean;
  hasThumbMaster: boolean;
  hasHeaven: boolean;

  // 8 = Mate (we’ll implement later, but 2 already enforces it if present)
  mateId?: string;

  stream?: MediaStream; // Local only, not synced
  cameraEnabled: boolean;
  micEnabled: boolean;
  activeSpeaker: boolean;

  lastReactionTime?: number;
}

export type GamePhase = "lobby" | "playing" | "paused" | "gameover";

export interface Rule {
  id: string;
  text: string;
  createdBy: string; // Player ID
}

export interface ReactionResult {
  playerId: string;
  time: number;
  rank: number;
}

export interface GameStats {
  totalDrinks: number;
  cardsDrawn: number;
  reactionsTriggered: number;
  gotchas: number;
}

/* ======================================================
   CARD 2 TARGETING
====================================================== */

export type TargetingStatus = "idle" | "select" | "confirm";
export type TargetingType = "YOU";

export interface TargetingState {
  status: TargetingStatus;
  type?: TargetingType;

  fromPlayerId?: string; // drawer
  targetPlayerId?: string; // selected target

  // turn continues after resolution
  nextPlayerIndex?: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  activeCard: Card | null;

  phase: GamePhase;

  currentPlayerIndex: number;
  kingsCount: number;
  rules: Rule[];

  lastReactionStart?: number;
  reactionResults: ReactionResult[];

  thumbMasterId?: string;
  questionMasterId?: string;
  heavenHolderId?: string;

  stats: GameStats;

  turnDirection: 1 | -1; // 1 for clockwise

  winnerId?: string;
  loserId?: string; // For reaction game

  // NEW: targeting state (Card 2)
  targeting: TargetingState;
}

export type NetworkMessage =
  | { type: "SYNC_STATE"; state: Partial<GameState> }
  | { type: "PLAYER_JOIN"; player: Omit<Player, "stream"> }
  | { type: "PLAYER_LEAVE"; playerId: string }
  | { type: "KICK_PLAYER"; playerId: string }
  | { type: "HOST_MIGRATE"; newHostId: string }
  | { type: "REACTION_TAP"; playerId: string; time: number }
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
  | { type: "DRAW_REQUEST"; playerId: string }
  // NEW: Targeting messages (Card 2)
  | {
      type: "TARGET_SET";
      fromPlayerId: string;
      targetPlayerId: string;
    }
  | {
      type: "TARGET_CONFIRM";
      fromPlayerId: string;
    }
  | {
      type: "TARGET_CANCEL";
      fromPlayerId: string;
    };
