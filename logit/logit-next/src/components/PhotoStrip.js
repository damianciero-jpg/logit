"use client";

import { useRef } from "react";

// ─── PHOTO STRIP ──────────────────────────────────────────────────────────────
// Horizontal thumbnail row for job photos. In editable mode it shows an
// "add" tile that opens the camera (capture="environment") or photo picker.
//
// props:
//   photos   — [{ id, url }]
//   onAdd    — (FileList) => void          (omit for read-only)
//   onRemove — (id) => void                (omit for read-only)
//   accent   — hex color for the add tile

export default function PhotoStrip({ photos = [], onAdd, onRemove, accent = "#F4811F" }) {
  const inputRef = useRef(null);
  const editable = typeof onAdd === "function";

  if (!editable && photos.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
      {photos.map((p) => (
        <div key={p.id} className="relative flex-shrink-0">
          <img
            src={p.url}
            alt="Job photo"
            className="w-[60px] h-[60px] rounded-lg object-cover border border-white/10"
          />
          {editable && onRemove && (
            <button
              onClick={() => onRemove(p.id)}
              aria-label="Remove photo"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#16161F] border border-white/20 text-white/70 text-[10px] leading-none flex items-center justify-center hover:text-white hover:border-white/40 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex-shrink-0 w-[60px] h-[60px] rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-white/[0.03]"
            style={{ borderColor: `${accent}50` }}
          >
            <span className="text-[16px] leading-none" style={{ color: accent }}>＋</span>
            <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">
              Photo
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) onAdd(e.target.files);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />
        </>
      )}
    </div>
  );
}
