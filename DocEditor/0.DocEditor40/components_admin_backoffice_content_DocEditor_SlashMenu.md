"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { SlashItem } from "./extensions/SlashCommand";

// Two modes:
// 1) Suggestion render (gets items + command)
// 2) Host render inside DocEditor (editor + onInsertImage) → returns null because Suggestion handles UI
type SuggestionProps = { items: SlashItem[]; command: (item: SlashItem) => void; editor: Editor };
type HostProps = { editor: Editor | null; onInsertImage: () => void };
type SlashMenuProps = SuggestionProps | HostProps;

const itemClasses = (active: boolean) =>
  `flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm ${
    active ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"
  }`;

const iconBox = "mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-white";

const SlashMenu = forwardRef(function SlashMenu(props: SlashMenuProps, ref) {
  // Host mode: do nothing; Suggestion extension drives UI.
  if (!("items" in props)) return null;

  const { items, command } = props;
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    // keyboard handling is delegated from Suggestion -> render.onKeyDown
    onKeyDown: (event: KeyboardEvent) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) => (s - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) {
          command(item);
          return true;
        }
      }
      return false;
    },
  }));

  return (
    <div className="absolute z-50 min-w-48 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      {items.length === 0 ? (
        <div className="px-2 py-1 text-sm text-slate-500">No commands</div>
      ) : (
        items.map((item, idx) => (
          <div
            key={item.title}
            className={itemClasses(idx === selected)}
            onMouseEnter={() => setSelected(idx)}
            onMouseDown={(e) => {
              e.preventDefault();
              command(item);
            }}
          >
            <div className="flex items-center gap-2">
              <span className={iconBox}>{item.icon}</span>
              <span className="font-medium text-slate-800">{item.title}</span>
            </div>
            {item.shortcut ? (
              <span className="ml-3 text-xs text-slate-400">{item.shortcut}</span>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
});

export default SlashMenu;
