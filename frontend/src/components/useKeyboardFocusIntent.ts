import { useEffect, useRef } from "react";

export const useKeyboardFocusIntent = () => {
  const isKeyboardIntent = useRef(false);

  useEffect(() => {
    const markKeyboardIntent = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) isKeyboardIntent.current = true;
    };
    const clearKeyboardIntent = () => {
      isKeyboardIntent.current = false;
    };
    const clearWhenHidden = () => {
      if (document.hidden) clearKeyboardIntent();
    };

    document.addEventListener("keydown", markKeyboardIntent, true);
    document.addEventListener("pointerdown", clearKeyboardIntent, true);
    document.addEventListener("pointermove", clearKeyboardIntent, true);
    window.addEventListener("blur", clearKeyboardIntent);
    document.addEventListener("visibilitychange", clearWhenHidden);
    return () => {
      document.removeEventListener("keydown", markKeyboardIntent, true);
      document.removeEventListener("pointerdown", clearKeyboardIntent, true);
      document.removeEventListener("pointermove", clearKeyboardIntent, true);
      window.removeEventListener("blur", clearKeyboardIntent);
      document.removeEventListener("visibilitychange", clearWhenHidden);
    };
  }, []);

  return isKeyboardIntent;
};
