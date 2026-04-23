"use client";

interface Props {
  bonusPosition: number;
  onSkip: () => void;
}

const BONUS_LABELS: Record<number, { title: string; description: string }> = {
  6: { title: "Bonus: Place Unit", description: "Place 1 unit in any region" },
  12: { title: "Bonus: Remove Fortress", description: "Remove 1 enemy fortress from any region" },
};

export default function BonusPanel({ bonusPosition, onSkip }: Props) {
  const info = BONUS_LABELS[bonusPosition];
  if (!info) return null;

  return (
    <div className="bg-yellow-900/60 border border-yellow-500 rounded-lg p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-yellow-200">{info.title}</div>
        <div className="text-xs text-yellow-300">{info.description}</div>
      </div>
      <button onClick={onSkip}
        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">
        Skip
      </button>
    </div>
  );
}
