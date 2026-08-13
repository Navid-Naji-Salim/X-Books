import { useCallback, useEffect } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { useLanguage } from "../i18n";
import { useConfirmation } from "./ConfirmationDialog";

export const useUnsavedChangesGuard = (hasUnsavedChanges: boolean) => {
  const { t } = useLanguage();
  const confirm = useConfirmation();
  const confirmDiscardChanges = useCallback(
    () => !hasUnsavedChanges
      ? Promise.resolve(true)
      : confirm({
        confirmLabel: t("Discard"),
        message: t("Your unsaved changes will be lost."),
        title: t("Discard unsaved changes?"),
      }),
    [confirm, hasUnsavedChanges, t],
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
    let isCurrent = true;
    void confirmDiscardChanges().then((confirmed) => {
      if (!isCurrent) return;
      if (confirmed) blocker.proceed();
      else blocker.reset();
    });
    return () => { isCurrent = false; };
  }, [blocker, confirmDiscardChanges]);

  return confirmDiscardChanges;
};
