"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { LotrQuestTrack, getBonusIconPath } from "@/types/lotr";

interface Props {
  questTrack: LotrQuestTrack;
  bonusPosition?: number;
}

const BONUS_SPACES = [3, 6, 9, 12];

export default function QuestTrack({ questTrack, bonusPosition }: Props) {
  const spaces = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className="bg-gray-900 rounded-lg p-3 text-white">
      <div className="text-xs font-semibold mb-2 text-gray-400">QUEST OF THE RING</div>
      <div className="flex gap-0.5 overflow-x-auto">
        {spaces.map(pos => {
          const isBonus = BONUS_SPACES.includes(pos);
          const isWin = pos === 14;
          const isFellowship = questTrack.fellowshipPosition === pos;
          const isSauron = questTrack.sauronPosition === pos;
          const isTriggered = bonusPosition === pos;
          return (
            <div key={pos} className={`flex flex-col items-center min-w-[28px] ${
              isTriggered ? "bg-yellow-500/60 ring-2 ring-yellow-400" :
              isWin ? "bg-amber-900/50" :
              isBonus ? "bg-yellow-900/50" :
              "bg-gray-800"
            } rounded p-1`}>
              <div className="text-[10px] text-gray-500">{pos}</div>
              <div className="w-5 h-5 flex items-center justify-center">
                {isFellowship && (
                  <motion.div
                    layoutId="fellowship-marker"
                    className="w-3 h-3 rounded-full bg-blue-400 border border-blue-300"
                    title="Fellowship"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                )}
                {isSauron && (
                  <motion.div
                    layoutId="sauron-marker"
                    className="w-3 h-3 rounded-full bg-red-400 border border-red-300"
                    title="Sauron"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                )}
              </div>
              {isBonus && (
                <Image src={getBonusIconPath(pos)} alt={`Bonus ${pos}`} width={16} height={16} className="mt-0.5" />
              )}
              {isWin && <div className="text-[8px] text-amber-400 font-bold">WIN</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
