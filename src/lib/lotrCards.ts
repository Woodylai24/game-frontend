import { LotrCardDef, LotrSkill, LotrCardColor, LotrRace, LotrRegion, LotrManeuverType, LotrAllianceTokenDef } from "@/types/lotr";

export interface ResolvedSkillCoverage {
  covered: boolean[];
  totalCoinSubstitution: number;
}

export function resolveSkillsWithOptions(
  playedCardIds: string[],
  costSkills: LotrSkill[],
  allianceTokenIds?: string[]
): ResolvedSkillCoverage {
  const fixedSkills: Record<string, number> = {};
  const optionCards: LotrSkill[][] = [];

  for (const cardId of playedCardIds) {
    const def = getCardDef(cardId);
    if (def?.color === "GREY" && def.greySkills) {
      if (def.greySkills.length === 1) {
        for (const s of def.greySkills[0]) {
          fixedSkills[s] = (fixedSkills[s] || 0) + 1;
        }
      } else {
        optionCards.push(def.greySkills.map(choice => choice[0]));
      }
    }
  }

  const available = { ...fixedSkills };
  const covered: boolean[] = [];

  for (const skill of costSkills) {
    if ((available[skill] ?? 0) > 0) {
      available[skill]--;
      covered.push(true);
    } else {
      let matched = false;
      for (let i = 0; i < optionCards.length; i++) {
        if (optionCards[i].includes(skill)) {
          optionCards.splice(i, 1);
          covered.push(true);
          matched = true;
          break;
        }
      }
      if (!matched) {
        covered.push(false);
      }
    }
  }

  let totalCoinSubstitution = covered.filter(c => !c).length;

  if (allianceTokenIds?.includes("AT-ELVES-3") && totalCoinSubstitution > 0) {
    const firstUncovered = covered.indexOf(false);
    if (firstUncovered !== -1) {
      covered[firstUncovered] = true;
    }
    totalCoinSubstitution -= 1;
  }

  return { covered, totalCoinSubstitution };
}

type CD = LotrCardDef;

function c(id: string, name: string, ch: number, color: LotrCardColor,
          coinCost: number, skillCost: LotrSkill[], chainCost: string | null,
          chain: string | null, extra: Partial<CD> = {}): CD {
  return { id, name, chapter: ch, color, coinCost, skillCost, chainCost, chainingSymbol: chain, ...extra };
}

export const ALL_CARDS: LotrCardDef[] = [
  c("C1-01","Orcs",1,"RED",0,["RUSE"],null,"Bow",{redBannerRegions:["GONDOR","ROHAN"],redUnitCount:1}),
  c("C1-02","Fellowship",1,"RED",0,[],null,"Helmet",{redBannerRegions:["ENEDWAITH","RHOVANION"],redUnitCount:1}),
  c("C1-03","Balrog",1,"RED",0,[],null,"Sword",{redBannerRegions:["LINDON","ARNOR"],redUnitCount:1}),
  c("C1-04","Gimli",1,"GREEN",0,["LEADERSHIP"],null,"Anvil",{greenRace:"DWARVES"}),
  c("C1-05","Legolas",1,"GREEN",0,["KNOWLEDGE"],null,"Harp",{greenRace:"ELVES"}),
  c("C1-06","Aragorn",1,"GREEN",0,["KNOWLEDGE"],null,"Horseshoe",{greenRace:"HUMANS"}),
  c("C1-07","Frodo & Sam",1,"GREEN",0,["LEADERSHIP"],null,"Pot",{greenRace:"HOBBITS"}),
  c("C1-08","Gollum - Cave 1",1,"BLUE",0,[],null,null,{blueRings:1}),
  c("C1-09","Gollum - Cave 2",1,"BLUE",1,[],null,"Fish",{blueRings:1}),
  c("C1-10","Gollum - Cave 3",1,"BLUE",0,["STRENGTH"],null,"Horse",{blueRings:1}),
  c("C1-11","Gollum - Cave 4",1,"BLUE",0,["COURAGE"],null,"Backpack",{blueRings:1}),
  c("C1-12","Dead Marshes 1",1,"GREY",0,[],null,null,{greySkills:[["COURAGE"]]}),
  c("C1-13","Dead Marshes 2",1,"GREY",0,[],null,null,{greySkills:[["COURAGE"]]}),
  c("C1-14","Dwarf Smith 1",1,"GREY",0,[],null,null,{greySkills:[["STRENGTH"]]}),
  c("C1-15","Dwarf Smith 2",1,"GREY",0,[],null,null,{greySkills:[["STRENGTH"]]}),
  c("C1-16","Archives - Minas Tirith 1",1,"GREY",0,[],null,null,{greySkills:[["KNOWLEDGE"]]}),
  c("C1-17","Imrahil - Captain of the West 1",1,"GREY",0,[],null,null,{greySkills:[["LEADERSHIP"]]}),
  c("C1-18","Nazgul 1",1,"GREY",0,[],null,null,{greySkills:[["RUSE"]]}),
  c("C1-19","Nazgul 2",1,"GREY",0,[],null,null,{greySkills:[["RUSE"]]}),
  c("C1-20","Gold Coins 1",1,"YELLOW",0,[],null,null,{yellowCoins:2}),
  c("C1-21","Gold Coins 2",1,"YELLOW",0,[],null,null,{yellowCoins:2}),
  c("C1-22","Gold Coins 3",1,"YELLOW",0,[],null,null,{yellowCoins:2}),
  c("C1-23","Gold Coins 4",1,"YELLOW",0,[],null,null,{yellowCoins:2}),

  c("C2-01","Uruk-hai",2,"RED",0,["RUSE","RUSE","RUSE"],"Bow",null,{redBannerRegions:["GONDOR","MORDOR"],redUnitCount:2}),
  c("C2-02","Spearmen",2,"RED",0,["STRENGTH","STRENGTH","COURAGE"],"Helmet","Armor",{redBannerRegions:["LINDON","ENEDWAITH"],redUnitCount:2}),
  c("C2-03","Archers",2,"RED",0,["RUSE","RUSE","KNOWLEDGE"],"Sword","Waraxe",{redBannerRegions:["MORDOR","ROHAN"],redUnitCount:2}),
  c("C2-04","First Light of the Fifth Day",2,"RED",0,["COURAGE","COURAGE","LEADERSHIP"],null,null,{redBannerRegions:["ARNOR","RHOVANION"],redUnitCount:2}),
  c("C2-05","Attack Troll",2,"RED",0,["RUSE","STRENGTH","COURAGE"],null,null,{redBannerRegions:["LINDON","ROHAN"],redUnitCount:2}),
  c("C2-06","Dwarves",2,"GREEN",0,["STRENGTH","STRENGTH","LEADERSHIP"],"Anvil",null,{greenRace:"DWARVES"}),
  c("C2-07","Galadriel",2,"GREEN",0,["COURAGE","LEADERSHIP","KNOWLEDGE"],"Harp",null,{greenRace:"ELVES"}),
  c("C2-08","Eowyn",2,"GREEN",0,["COURAGE","COURAGE","KNOWLEDGE"],"Horseshoe","Scroll",{greenRace:"HUMANS"}),
  c("C2-09","Merry & Pippin",2,"GREEN",0,["RUSE","RUSE","LEADERSHIP"],"Pot","Chestnut",{greenRace:"HOBBITS"}),
  c("C2-10","Gollum - River 1",2,"BLUE",0,["COURAGE","STRENGTH"],"Horse",null,{blueRings:1}),
  c("C2-11","Gollum - River 2",2,"BLUE",1,[],"Backpack",null,{blueRings:1}),
  c("C2-12","Gollum - River 3",2,"BLUE",0,["STRENGTH","COURAGE","COURAGE"],null,"Campfire",{blueRings:2}),
  c("C2-13","Gollum - River 4",2,"BLUE",0,["STRENGTH","STRENGTH","KNOWLEDGE"],null,"Bedroll",{blueRings:2}),
  c("C2-14","Gollum - River 5",2,"BLUE",0,["RUSE","STRENGTH"],null,null,{blueRings:1}),
  c("C2-15","Archives - Minas Tirith 2",2,"GREY",0,[],null,null,{greySkills:[["KNOWLEDGE"]]}),
  c("C2-16","Imrahil - Captain of the West 2",2,"GREY",0,[],null,null,{greySkills:[["LEADERSHIP"]]}),
  c("C2-17","Spiders of Mirkwood",2,"GREY",1,[],null,null,{greySkills:[["COURAGE","COURAGE"]]}),
  c("C2-18","Oliphanut",2,"GREY",1,[],null,null,{greySkills:[["STRENGTH","STRENGTH"]]}),
  c("C2-19","Lothlorien Cloak",2,"GREY",1,[],null,null,{greySkills:[["RUSE","RUSE"]]}),
  c("C2-20","Captains of the West",2,"GREY",1,["RUSE"],null,null,{greySkills:[["LEADERSHIP"],["KNOWLEDGE"]]}),
  c("C2-21","Ambush",2,"GREY",1,["LEADERSHIP","KNOWLEDGE"],null,null,{greySkills:[["RUSE"],["STRENGTH"],["COURAGE"]]}),
  c("C2-22","Bags of Gold",2,"YELLOW",0,[],null,"Chest",{yellowCoins:3}),
  c("C2-23","Treasure Chests 1",2,"YELLOW",0,[],null,null,{yellowCoins:4}),

  c("C3-01","Minas Tirith",3,"RED",0,["STRENGTH","STRENGTH","COURAGE","COURAGE"],"Armor",null,{redBannerRegions:["ENEDWAITH","ROHAN"],redUnitCount:3}),
  c("C3-02","Banners",3,"RED",0,["RUSE","STRENGTH","LEADERSHIP","LEADERSHIP","KNOWLEDGE"],"Waraxe",null,{redBannerRegions:["GONDOR","ARNOR"],redUnitCount:3}),
  c("C3-03","Oliphanuts",3,"RED",0,["RUSE","RUSE","COURAGE","COURAGE"],null,null,{redBannerRegions:["ENEDWAITH","ARNOR"],redUnitCount:3}),
  c("C3-04","Nazgul-Bird",3,"RED",0,["RUSE","RUSE","RUSE","LEADERSHIP","LEADERSHIP"],null,null,{redBannerRegions:["RHOVANION","GONDOR"],redUnitCount:3}),
  c("C3-05","Mountain Trolls",3,"RED",0,["RUSE","RUSE","COURAGE","KNOWLEDGE","KNOWLEDGE"],null,null,{redBannerRegions:["LINDON","MORDOR"],redUnitCount:3}),
  c("C3-06","Imrahil's Cavalry",3,"RED",0,["RUSE","STRENGTH","STRENGTH","COURAGE","COURAGE"],null,null,{redBannerRegions:["RHOVANION","MORDOR"],redUnitCount:3}),
  c("C3-07","Saruman",3,"GREEN",0,["STRENGTH","LEADERSHIP","KNOWLEDGE"],null,null,{greenRace:"WIZARDS"}),
  c("C3-08","Gandalf",3,"GREEN",0,["RUSE","RUSE","LEADERSHIP","LEADERSHIP"],"Scroll",null,{greenRace:"WIZARDS"}),
  c("C3-09","Treebeard",3,"GREEN",0,["STRENGTH","STRENGTH","KNOWLEDGE","KNOWLEDGE"],"Chestnut",null,{greenRace:"ENTS"}),
  c("C3-10","Quickbeam",3,"GREEN",0,["COURAGE","COURAGE","LEADERSHIP","KNOWLEDGE"],null,null,{greenRace:"ENTS"}),
  c("C3-11","Gollum - Close 1",3,"BLUE",0,["RUSE","RUSE","COURAGE","COURAGE"],"Fish",null,{blueRings:2}),
  c("C3-12","Gollum - Close 2",3,"BLUE",0,["RUSE","RUSE","RUSE","STRENGTH","STRENGTH","STRENGTH"],"Campfire",null,{blueRings:2}),
  c("C3-13","Gollum - Close 3",3,"BLUE",0,["RUSE","RUSE","RUSE","COURAGE"],"Bedroll",null,{blueRings:2}),
  c("C3-14","Gollum - Close 4",3,"BLUE",0,["STRENGTH","LEADERSHIP"],null,null,{blueRings:2}),
  c("C3-15","Gollum - Close 5",3,"BLUE",3,[],null,null,{blueRings:3}),
  c("C3-16","Battering Ram",3,"PURPLE",0,["STRENGTH","STRENGTH","LEADERSHIP"],null,null,{purpleManeuvers:["REMOVE_ENEMY_UNIT","STEAL_COIN","MOVE_UNIT"] as LotrManeuverType[]}),
  c("C3-17","Orcs",3,"PURPLE",0,["RUSE","STRENGTH","COURAGE","KNOWLEDGE"],null,null,{purpleManeuvers:["STEAL_COIN","MOVE_UNIT","MOVE_UNIT"] as LotrManeuverType[]}),
  c("C3-18","Ballista",3,"PURPLE",0,["STRENGTH","COURAGE","KNOWLEDGE","KNOWLEDGE"],null,null,{purpleManeuvers:["REMOVE_ENEMY_UNIT","REMOVE_ENEMY_UNIT","STEAL_COIN"] as LotrManeuverType[]}),
  c("C3-19","Swords Orc",3,"PURPLE",0,["COURAGE","COURAGE","COURAGE","LEADERSHIP"],null,null,{purpleManeuvers:["REMOVE_ENEMY_UNIT","STEAL_COIN","STEAL_COIN"] as LotrManeuverType[]}),
  c("C3-20","Mountain Army",3,"PURPLE",0,["STRENGTH","STRENGTH","STRENGTH","KNOWLEDGE"],null,null,{purpleManeuvers:["REMOVE_ENEMY_UNIT","MOVE_UNIT","MOVE_UNIT"] as LotrManeuverType[]}),
  c("C3-21","Hill Army",3,"PURPLE",0,["COURAGE","COURAGE","LEADERSHIP","KNOWLEDGE"],null,null,{purpleManeuvers:["MOVE_UNIT","MOVE_UNIT","MOVE_UNIT"] as LotrManeuverType[]}),
  c("C3-22","Treasure Chests 2",3,"YELLOW",0,["RUSE","RUSE","COURAGE"],"Chest",null,{yellowCoins:5}),
  c("C3-23","Treasure Chests 3",3,"YELLOW",0,["RUSE","LEADERSHIP","KNOWLEDGE"],null,null,{yellowCoins:5}),
];

const cardMap = new Map(ALL_CARDS.map(c => [c.id, c]));
export function getCardDef(id: string): LotrCardDef | undefined { return cardMap.get(id); }

export function getCardEffectText(card: LotrCardDef): string {
  switch (card.color) {
    case "YELLOW": return `Gain ${card.yellowCoins ?? 0} coins`;
    case "BLUE": return `Advance ${card.blueRings ?? 0} ring(s) on quest track`;
    case "GREEN": return card.greenRace ? `Gain a ${card.greenRace} race symbol` : "";
    case "RED": return card.redBannerRegions ? `Place ${card.redUnitCount} unit(s) in ${card.redBannerRegions.join(" or ")}` : "";
    case "GREY": return card.greySkills ? `Gain skill(s): ${card.greySkills.flat().join(", ")}` : "";
    case "PURPLE": return card.purpleManeuvers ? `Maneuvers: ${card.purpleManeuvers.join(", ")}` : "";
    default: return "";
  }
}

export const ALLIANCE_TOKENS: LotrAllianceTokenDef[] = [
  { id: "AT-ELVES-1", name: "Elven Grace", race: "ELVES", effect: "When you play a Yellow card, take another turn after finishing this one.", faceUp: false },
  { id: "AT-ELVES-2", name: "Elven Archers", race: "ELVES", effect: "When you play a Red card, you may place all concerned Units in any 1 of the 7 regions.", faceUp: false },
  { id: "AT-ELVES-3", name: "Elven Light", race: "ELVES", effect: "Once per turn, benefit from any Skill.", faceUp: false },
  { id: "AT-HOBBITS-1", name: "Eagle Symbol", race: "HOBBITS", effect: "Gives the Eagle Symbol - additional Race symbol counting as 1 of 6 required for Support of the Races victory.", faceUp: false },
  { id: "AT-HOBBITS-2", name: "Hobbit Courage", race: "HOBBITS", effect: "When you play a Blue card, also place 1 Unit in any region.", faceUp: false },
  { id: "AT-HOBBITS-3", name: "Hobbit Luck", race: "HOBBITS", effect: "When you play a card using a chaining symbol, take 3 Coins from the reserve.", faceUp: false },
  { id: "AT-ENTS-1", name: "Entmoot", race: "ENTS", effect: "Take another turn after finishing this one.", faceUp: false },
  { id: "AT-ENTS-2", name: "Ent Wrath", race: "ENTS", effect: "Remove 1 enemy Fortress from any region, return to opponent.", faceUp: false },
  { id: "AT-ENTS-3", name: "Ent Fury", race: "ENTS", effect: "Choose 3 times between: Remove 1 enemy Unit / Opponent loses 1 Coin / Complete 1 movement.", faceUp: false },
  { id: "AT-DWARVES-1", name: "Dwarven Craft", race: "DWARVES", effect: "When you play a Landmark tile, ignore the additional Coin cost.", faceUp: false },
  { id: "AT-DWARVES-2", name: "Dwarven Fortitude", race: "DWARVES", effect: "When you play a Landmark tile, take another turn after finishing this one.", faceUp: false },
  { id: "AT-DWARVES-3", name: "Dwarven March", race: "DWARVES", effect: "When you play a Green card, also complete 2 movements on the central board.", faceUp: false },
  { id: "AT-HUMANS-1", name: "Rally", race: "HUMANS", effect: "When you play a Yellow card, also move your quest character 1 space.", faceUp: false },
  { id: "AT-HUMANS-2", name: "Reinforcements", race: "HUMANS", effect: "When you play a Red card, place 1 additional Unit in the chosen region.", faceUp: false },
  { id: "AT-HUMANS-3", name: "Scavenger", race: "HUMANS", effect: "When you discard a card, take 2x the chapter coins (2/4/6) from the reserve.", faceUp: false },
  { id: "AT-WIZARDS-1", name: "Wizard's Journey", race: "WIZARDS", effect: "Move your quest character 2 spaces.", faceUp: false },
  { id: "AT-WIZARDS-2", name: "Wizard's Aid", race: "WIZARDS", effect: "Place 2 Units in 1 region, or 1 Unit in 2 regions.", faceUp: false },
  { id: "AT-WIZARDS-3", name: "Wizard's Insight", race: "WIZARDS", effect: "Take all discard cards, secretly choose 1, play it for free.", faceUp: false },
];

const tokenMap = new Map(ALLIANCE_TOKENS.map(t => [t.id, t]));
export function getTokenDef(id: string): LotrAllianceTokenDef | undefined { return tokenMap.get(id); }

export const LANDMARK_EFFECTS: Record<string, string> = {
  "LM-01": "Place 1 Fortress in Mordor. Take all discard cards, secretly choose 1, play it for free.",
  "LM-02": "Place 1 Fortress + 2 Units in Arnor. Complete 2 movements on the board.",
  "LM-03": "Place 1 Fortress in Rhovanion. Take 5 coins from reserve. Complete 1 movement.",
  "LM-04": "Place 1 Fortress in Lindon. Take top 2 tokens of any Race, reveal, keep 1, return other.",
  "LM-05": "Place 1 Fortress + 3 Units in Rohan.",
  "LM-06": "Place 1 Fortress in Enedwaith. Discard 1 Grey card from opponent's play area. Move quest 1 space.",
  "LM-07": "Place 1 Fortress + 1 Unit in Gondor. Move quest 2 spaces.",
};

const LANDMARK_NAMES: Record<string, string> = {
  "LM-01": "Barad-Dur",
  "LM-02": "Bree",
  "LM-03": "Erebor",
  "LM-04": "Grey Havens",
  "LM-05": "Helm's Deep",
  "LM-06": "Isengard",
  "LM-07": "Minas Tirith",
};

export function getLandmarkDef(id: string): { id: string; name: string; effect: string } | undefined {
  const name = LANDMARK_NAMES[id];
  const effect = LANDMARK_EFFECTS[id];
  if (!name || !effect) return undefined;
  return { id, name, effect };
}
