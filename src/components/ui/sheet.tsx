"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;
export function SheetContent({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content className="sheet-content">
        {children}
        <Dialog.Close
          className="icon-button sheet-close"
          aria-label="Close menu"
        >
          <X size={22} />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
