"use client";

import { LotrQuestTrack, LotrPlayerSide } from "@/types/lotr";

interface Props {
  questTrack: LotrQuestTrack;
}

const BONUS_SPACES = [3, 6, 9, 12, 14];

export default function QuestTrack({ questTrack }: Props) {
  const spaces = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className="bg-gray-900 rounded-lg p-3 text-white">
      <div className="text-xs font-semibold mb-2 text-gray-400">QUEST OF THE RING</div>
      <div className="flex gap-0.5 overflow-x-auto">
        {spaces.map(pos => {
          const isBonus = BONUS_SPACES.includes(pos);
          const isFellowship = questTrack.fellowshipPosition === pos;
          const isSauron = questTrack.sauronPosition === pos;
          return (
            <div key={pos} className={`flex flex-col items-center min-w-[28px] ${isBonus ? "bg-yellow-900/50" : "bg-gray-800"} rounded p-1`}>
              <div className="text-[10px] text-gray-500">{pos}</div>
              <div className="w-5 h-5 flex items-center justify-center">
                {isFellowship && <div className="w-3 h-3 rounded-full bg-blue-400 border border-blue-300" title="Fellowship" />}
                {isSauron && <div className="w-3 h-3 rounded-full bg-red-400 border border-red-300" title="Sauron" />}
              </div>
              {isBonus && <div className="text-[8px] text-yellow-400">★</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
