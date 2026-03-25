"use client";

import { useEffect, useState } from "react";
import type { LayoutNode } from "./layoutTypes";
import { Textarea } from "@/components/ui/textarea";

type LayoutJsonEditorProps = {
  layout: LayoutNode;
  onChange: (layout: LayoutNode) => void;
  label?: string;
};

const pretty = (value: LayoutNode) => JSON.stringify(value, null, 2);

export function LayoutJsonEditor({ layout, onChange, label = "Layout JSON" }: LayoutJsonEditorProps) {
  const [text, setText] = useState(() => pretty(layout));
  const [error, setError] = useState<string | null>(null);

  // Keep textarea in sync when the incoming layout prop changes externally.
  useEffect(() => {
    setText(pretty(layout));
  }, [layout]);

  const handleChange = (value: string) => {
    setText(value);
    try {
      const parsed = JSON.parse(value) as LayoutNode;
      if (isLayoutNode(parsed)) {
        setError(null);
        onChange(parsed);
      } else {
        setError("Parsed JSON is not a valid LayoutNode shape.");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-800">{label}</label>
        {error ? <span className="text-xs text-amber-600">Invalid JSON</span> : null}
      </div>
      <Textarea
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        className="font-mono text-xs leading-5"
        rows={24}
      />
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {error}
        </div>
      ) : (
        <div className="text-xs text-slate-500">Edit the JSON to change the layout.</div>
      )}
    </div>
  );
}

function isLayoutNode(node: unknown): node is LayoutNode {
  if (!node || typeof node !== "object") return false;
  const n = node as { type?: unknown; children?: unknown; fieldId?: unknown };
  if (n.type === "field") {
    return typeof n.fieldId === "string" && typeof (n as any).id === "string";
  }
  if (n.type === "column") {
    return Array.isArray(n.children) && typeof (n as any).id === "string" && n.children.every(isLayoutNode);
  }
  if (n.type === "row") {
    return Array.isArray(n.children) && typeof (n as any).id === "string" && n.children.every(isLayoutNode);
  }
  return false;
}
