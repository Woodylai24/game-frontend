"use client";

import { useState } from "react";

const PAGES = [
  "/lotr/player-aid/page-1.png",
  "/lotr/player-aid/page-2.png",
  "/lotr/player-aid/page-3.png",
];

interface Props {
  onClose: () => void;
}

export default function PlayerAidModal({ onClose }: Props) {
  const [page, setPage] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-200">
            Player Aid — Page {page + 1} / {PAGES.length}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center bg-gray-950">
          <img
            src={PAGES[page]}
            alt={`Player aid page ${page + 1}`}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <div className="flex gap-1.5">
            {PAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === page ? "bg-blue-500" : "bg-gray-600 hover:bg-gray-500"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))}
            disabled={page === PAGES.length - 1}
            className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
