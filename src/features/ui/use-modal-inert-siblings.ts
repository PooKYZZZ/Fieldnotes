"use client";

import { useEffect, type RefObject } from "react";

export function useModalInertSiblings(dialogRef: RefObject<HTMLElement | null>, open: boolean): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const previousValues = new Map<HTMLElement, boolean>();
    let branch: HTMLElement = dialog;
    let parent = branch.parentElement;
    while (parent) {
      for (const child of parent.children) {
        if (!(child instanceof HTMLElement) || child === branch || child.contains(dialog) || child.hasAttribute("data-modal-dismiss")) continue;
        previousValues.set(child, child.inert);
        // This effect synchronizes the modal's accessibility boundary with the DOM.
        // eslint-disable-next-line react-hooks/immutability
        child.inert = true;
      }
      branch = parent;
      parent = parent.parentElement;
    }

    return () => {
      for (const [element, wasInert] of previousValues) {
        element.inert = wasInert;
      }
    };
  }, [dialogRef, open]);
}
