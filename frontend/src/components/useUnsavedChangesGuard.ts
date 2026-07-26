import { useCallback, useEffect } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { useLanguage } from "../i18n";

export const useUnsavedChangesGuard = (hasUnsavedChanges: boolean) => {
  const { t } = useLanguage();
  const confirmDiscardChanges = useCallback(
    () => !hasUnsavedChanges || window.confirm(t("Discard unsaved changes?")),
    [hasUnsavedChanges, t],
  );

  useBeforeUnload(useCallback((event) => {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = "";
  }, [hasUnsavedChanges]));

  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    hasUnsavedChanges
    && (
      currentLocation.pathname !== nextLocation.pathname
      || currentLocation.search !== nextLocation.search
      || currentLocation.hash !== nextLocation.hash
    )
  ));

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (confirmDiscardChanges()) blocker.proceed();
    else blocker.reset();
  }, [blocker, confirmDiscardChanges]);

  return confirmDiscardChanges;
};
