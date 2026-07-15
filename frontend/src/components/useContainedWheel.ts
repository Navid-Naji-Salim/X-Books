import { useEffect, type RefObject } from "react";

const canScrollInDirection = (element: HTMLElement, deltaY: number) => {
  const overflowY = window.getComputedStyle(element).overflowY;
  if (!/(auto|scroll)/.test(overflowY) || element.scrollHeight <= element.clientHeight) return false;
  if (deltaY < 0) return element.scrollTop > 0;
  if (deltaY > 0) return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  return false;
};

export const useContainedWheel = <T extends HTMLElement>(ref: RefObject<T | null>, enabled: boolean) => {
  useEffect(() => {
    const panel = ref.current;
    if (!enabled || !panel) return;

    const containWheel = (event: WheelEvent) => {
      let element = event.target instanceof HTMLElement ? event.target : panel;
      let canScrollPanel = false;

      while (panel.contains(element)) {
        if (canScrollInDirection(element, event.deltaY)) {
          canScrollPanel = true;
          break;
        }
        if (element === panel || !element.parentElement) break;
        element = element.parentElement;
      }

      event.stopPropagation();
      if (!canScrollPanel) event.preventDefault();
    };

    panel.addEventListener("wheel", containWheel, { passive: false });
    return () => panel.removeEventListener("wheel", containWheel);
  }, [enabled, ref]);
};
