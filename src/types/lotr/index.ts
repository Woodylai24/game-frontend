export type LotrPlayerSide = "FELLOWSHIP" | "SAURON";
export type LotrSkill = "RUSE" | "STRENGTH" | "COURAGE" | "KNOWLEDGE" | "LEADERSHIP";
export type LotrRace = "ELVES" | "ENTS" | "HOBBITS" | "HUMANS" | "DWARVES" | "WIZARDS";
export type LotrCardColor = "GREY" | "YELLOW" | "BLUE" | "GREEN" | "RED" | "PURPLE";
export type LotrManeuverType = "MOVE_UNIT" | "STEAL_COIN" | "REMOVE_ENEMY_UNIT";
export type LotrRegion = "LINDON" | "ARNOR" | "RHOVANION" | "ENEDWAITH" | "ROHAN" | "GONDOR" | "MORDOR";

export interface LotrCardDef {
  id: string;
  name: string;
  chapter: number;
  color: LotrCardColor;
  coinCost: number;
  skillCost: LotrSkill[];
  chainCost: string | null;
  chainingSymbol: string | null;
  greySkills?: LotrSkill[][];
  yellowCoins?: number;
  blueRings?: number;
  greenRace?: LotrRace;
  redBannerRegions?: LotrRegion[];
  redUnitCount?: number;
  purpleManeuvers?: LotrManeuverType[];
}

export interface LotrCardSlot {
  id: number;
  cardDefId: string | null;
  coveredBy: number[];
  covers: number[];
  faceUp: boolean;
}

export interface LotrLandmarkTileDef {
  id: string;
  name: string;
  region: LotrRegion;
  skillCost: LotrSkill[];
  effect: string;
  faceUp: boolean;
}

export interface LotrAllianceTokenDef {
  id: string;
  name: string;
  race: LotrRace;
  effect: string;
  faceUp: boolean;
}

export interface LotrRegionState {
  region: LotrRegion;
  fortress: LotrPlayerSide | null;
  units: number;
}

export interface LotrPlayerState {
  side: LotrPlayerSide;
  coins: number;
  playedCardIds: string[];
  allianceTokenIds: string[];
  raceSymbols: Record<LotrRace, number>;
  hasUsedThreeDifferentRaces: boolean;
}

export interface LotrQuestTrack {
  fellowshipPosition: number;
  sauronPosition: number;
}

export interface LotrGameState {
  fellowship: LotrPlayerState;
  sauron: LotrPlayerState;
  regions: LotrRegionState[];
  questTrack: LotrQuestTrack;
  currentChapter: number;
  currentTurnPlayer: LotrPlayerSide;
  cardSlots: LotrCardSlot[];
  landmarkTiles: LotrLandmarkTileDef[];
  allianceTokenCounts?: Record<string, number>;
  allianceTokenStacks?: Record<string, LotrAllianceTokenDef[]>;
  maneuverPhase?: boolean;
  pendingManeuvers?: LotrManeuverType[];
  maneuverPlayer?: LotrPlayerSide | null;
  bonusPhase?: boolean;
  bonusPosition?: number;
  bonusPlayer?: LotrPlayerSide | null;
  extraTurn?: boolean;
  landmarkPhase?: boolean;
  activeLandmarkId?: string | null;
  landmarkPlayer?: LotrPlayerSide | null;
  landmarkMovementsRemaining?: number;
  landmarkSubPhase?: string | null;
  landmarkDrawnTokens?: string[];
  alliancePhase?: boolean;
  alliancePlayer?: LotrPlayerSide | null;
  allianceTriggerType?: string | null;
  allianceRace?: string | null;
  allianceDrawnTokenIds?: string[];
  allianceDrawnTokens?: LotrAllianceTokenDef[];
  allianceEffectPhase?: boolean;
  allianceEffectPlayer?: LotrPlayerSide | null;
  allianceEffectType?: string | null;
  allianceEffectCounter?: number;
  allianceEffectSubPhase?: string | null;
  allianceEffectSelectedRegions?: string[];
  discardPile?: string[];
}

export interface LotrStateResponse {
  sessionId: number;
  roomId: number;
  gameStatus: string;
  gameState: string;
  parsedState: LotrGameState | null;
  players: { username: string; playerOrder: number; side: string }[];
}

export const SKILL_ABBR: Record<LotrSkill, string> = {
  RUSE: "R",
  STRENGTH: "S",
  COURAGE: "C",
  KNOWLEDGE: "K",
  LEADERSHIP: "L",
};

export const SKILL_COLOR: Record<LotrSkill, string> = {
  RUSE: "bg-blue-100 text-blue-800",
  STRENGTH: "bg-red-100 text-red-800",
  COURAGE: "bg-green-100 text-green-800",
  KNOWLEDGE: "bg-purple-100 text-purple-800",
  LEADERSHIP: "bg-yellow-100 text-yellow-800",
};

export const CARD_COLOR_BG: Record<LotrCardColor, string> = {
  GREY: "bg-gray-200 border-gray-400",
  YELLOW: "bg-yellow-100 border-yellow-500",
  BLUE: "bg-blue-100 border-blue-500",
  GREEN: "bg-green-100 border-green-500",
  RED: "bg-red-100 border-red-500",
  PURPLE: "bg-purple-100 border-purple-500",
};

export const CARD_COLOR_TEXT: Record<LotrCardColor, string> = {
  GREY: "text-gray-700",
  YELLOW: "text-yellow-700",
  BLUE: "text-blue-700",
  GREEN: "text-green-700",
  RED: "text-red-700",
  PURPLE: "text-purple-700",
};

export const REGION_ADJACENCY: Record<LotrRegion, LotrRegion[]> = {
  LINDON: ["ARNOR"],
  ARNOR: ["LINDON", "RHOVANION", "ENEDWAITH"],
  RHOVANION: ["ARNOR", "ENEDWAITH", "ROHAN"],
  ENEDWAITH: ["ARNOR", "RHOVANION", "ROHAN", "GONDOR"],
  ROHAN: ["RHOVANION", "ENEDWAITH", "GONDOR", "MORDOR"],
  GONDOR: ["ENEDWAITH", "ROHAN", "MORDOR"],
  MORDOR: ["ROHAN", "GONDOR"],
};

export const REGION_POSITIONS: Record<LotrRegion, { x: number; y: number }> = {
  LINDON: { x: 10, y: 25 },
  ARNOR: { x: 30, y: 20 },
  RHOVANION: { x: 55, y: 15 },
  ENEDWAITH: { x: 35, y: 45 },
  ROHAN: { x: 55, y: 45 },
  GONDOR: { x: 55, y: 70 },
  MORDOR: { x: 75, y: 65 },
};

// Combined image mapping: some cards share a single image file
const CARD_IMAGE_MAP: Record<string, string> = {
  "C1-12": "12_13", "C1-13": "12_13",
  "C1-14": "14_15", "C1-15": "14_15",
  "C1-18": "18_19", "C1-19": "18_19",
  "C1-20": "20_21_22_23", "C1-21": "20_21_22_23", "C1-22": "20_21_22_23", "C1-23": "20_21_22_23",
};

export function getCardImagePath(cardDefId: string, chapter: number): string {
  const mapped = CARD_IMAGE_MAP[cardDefId];
  if (mapped) return `/lotr/Cards/Chapter_${chapter}/${mapped}.png`;
  const num = parseInt(cardDefId.split("-")[1]);
  return `/lotr/Cards/Chapter_${chapter}/${num}.png`;
}

export function getCardBackPath(chapter: number): string {
  return `/lotr/Cards/Chapter_${chapter}/back.png`;
}

export function getLandmarkImagePath(tileId: string): string {
  const num = tileId.replace("LM-0", "");
  return `/lotr/Landmarks/${num}.png`;
}

export function getSkillIconPath(skill: LotrSkill): string {
  return `/lotr/Icons/Skills/${skill.charAt(0) + skill.slice(1).toLowerCase()}.png`;
}

export function getRaceIconPath(race: LotrRace): string {
  const map: Record<LotrRace, string> = {
    ELVES: "Elves", ENTS: "Ents", HOBBITS: "Hobbits",
    HUMANS: "Humans", DWARVES: "Dwarves", WIZARDS: "Wizards"
  };
  return `/lotr/Icons/Races/${map[race]}.png`;
}

export function getRegionIconPath(region: LotrRegion): string {
  return `/lotr/Icons/Regions/${region.charAt(0) + region.slice(1).toLowerCase()}.png`;
}

export function getLandmarkBackPath(): string {
  return `/lotr/Landmarks/back.png`;
}

export function getBonusIconPath(position: number): string {
  return `/lotr/QuestTrack/${position}.png`;
}
