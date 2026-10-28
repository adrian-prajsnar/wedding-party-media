import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { activateGuest, guestSession } from "../api";
import { PageLoading } from "./LoadingState";

type GateState = "loading" | "allowed" | "denied";

export function GuestGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const invite = searchParams.get("access");
      if (invite) {
        try {
          await activateGuest(invite);
        } catch {
          if (!cancelled) setState("denied");
          return;
        }
        const next = new URLSearchParams(searchParams);
        next.delete("access");
        const search = next.toString();
        navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
      }

      const session = await guestSession();
      if (cancelled) return;
      if (!session.required || session.ok) setState("allowed");
      else setState("denied");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate, searchParams]);

  if (state === "loading") return <PageLoading />;
  if (state === "denied") return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
