"use client";

import * as React from "react";
import {
  Dialog as BaseDialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";
import { Button } from "./button";

// Light wrapper to provide the AlertDialog API shape used across the app.
export const AlertDialog = BaseDialog;
export const AlertDialogTrigger = DialogTrigger;
export const AlertDialogContent = DialogContent;
export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;

export const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ children, ...props }, ref) => (
  <DialogClose asChild>
    <Button ref={ref} {...props}>
      {children}
    </Button>
  </DialogClose>
));
AlertDialogAction.displayName = "AlertDialogAction";

export const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ children, ...props }, ref) => (
  <DialogClose asChild>
    <Button ref={ref} variant="outline" {...props}>
      {children}
    </Button>
  </DialogClose>
));
AlertDialogCancel.displayName = "AlertDialogCancel";

export const AlertDialogTriggerButton = AlertDialogTrigger;
