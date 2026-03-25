"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "./ConfirmDialog";

type BulkAction = {
  value: string;
  label: string;
  onExecute: (ids: string[]) => Promise<void> | void;
  confirmMessage?: string;
  variant?: "default" | "danger";
};

type BulkActionsProps = {
  selectedIds: string[];
  actions: BulkAction[];
  disabled?: boolean;
  onComplete?: () => void;
};

export function BulkActions({ selectedIds, actions, disabled, onComplete }: BulkActionsProps) {
  const [action, setAction] = useState<string>("");
  const [running, setRunning] = useState(false);

  const selectedAction = useMemo(
    () => actions.find((candidate) => candidate.value === action),
    [actions, action],
  );

  const execute = async () => {
    if (!selectedAction) return;
    setRunning(true);
    try {
      await selectedAction.onExecute(selectedIds);
      onComplete?.();
      setAction("");
    } finally {
      setRunning(false);
    }
  };

  const button = (
    <Button
      variant={selectedAction?.variant === "danger" ? "destructive" : "default"}
      disabled={!selectedAction || running || disabled || selectedIds.length === 0}
      onClick={() => {
        if (selectedAction?.confirmMessage) return;
        void execute();
      }}
    >
      {running ? "Applying..." : "Apply"}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={action} onValueChange={setAction}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Bulk action" />
        </SelectTrigger>
        <SelectContent>
          {actions.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedAction?.confirmMessage ? (
        <ConfirmDialog
          trigger={button}
          title={selectedAction.label}
          description={selectedAction.confirmMessage}
          variant={selectedAction.variant}
          confirmLabel="Confirm"
          onConfirm={execute}
        />
      ) : (
        button
      )}
    </div>
  );
}
