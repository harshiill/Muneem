"use client";

import { useEffect, useRef } from "react";

interface MentionDropdownProps {
  people: string[];
  query: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function MentionDropdown({
  people,
  query,
  onSelect,
  onClose,
}: MentionDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  const filtered = people.filter((p) =>
    p.toLowerCase().startsWith(query.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-border/60">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          People
        </p>
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {filtered.map((person) => (
          <li key={person}>
            <button
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                onSelect(person);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary text-left transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {person[0].toUpperCase()}
              </span>
              <span className="text-sm font-medium text-foreground">
                {person}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
