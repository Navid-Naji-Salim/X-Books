import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ModalLayer } from "./ModalLayer";
import { useLanguage } from "../i18n";

type ConfirmationOptions = {
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  title: string;
};

type PendingConfirmation = ConfirmationOptions & {
  resolve: (confirmed: boolean) => void;
};

type ConfirmationContextValue = {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
};

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export const ConfirmationProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  const settle = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmationOptions) => {
    if (pendingRef.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);
  const contextValue = useMemo(() => ({ confirm }), [confirm]);

  useEffect(() => () => {
    pendingRef.current?.resolve(false);
    pendingRef.current = null;
  }, []);

  return (
    <ConfirmationContext.Provider value={contextValue}>
      {children}
      {pending ? (
        <ModalLayer initialFocusRef={cancelRef} onClose={() => settle(false)}>
          <section
            aria-describedby={messageId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="panel payment-modal"
            role="alertdialog"
          >
            <div className="item-form-head">
              <div>
                <h2 id={titleId}>{pending.title}</h2>
                <p id={messageId}>{pending.message}</p>
              </div>
            </div>
            <div className="payment-modal-actions">
              <button className="ghost-button" ref={cancelRef} type="button" onClick={() => settle(false)}>
                {pending.cancelLabel ?? t("Cancel")}
              </button>
              <button className="button danger-button" type="button" onClick={() => settle(true)}>
                {pending.confirmLabel}
              </button>
            </div>
          </section>
        </ModalLayer>
      ) : null}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error("useConfirmation must be used inside ConfirmationProvider");
  return context.confirm;
};
