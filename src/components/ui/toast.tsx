import * as React from "react";
import { cn } from "@/lib/cn";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2 rounded-md border border-border bg-card p-3 shadow-lg",
              t.variant === "destructive" && "border-destructive/40",
              t.variant === "success" && "border-success/40"
            )}
          >
            {t.variant === "destructive" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            ) : t.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : null}
            <div className="flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              {t.description && (
                <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
              )}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="opacity-50 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 내부에서 사용해야 합니다.");
  return ctx;
}
