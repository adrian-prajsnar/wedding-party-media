import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getConfig, type WeddingConfig } from "./api";

const ConfigContext = createContext<WeddingConfig>({
  title: "A & A",
  date: "26 czerwca 2026",
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WeddingConfig>({
    title: "A & A",
    date: "26 czerwca 2026",
  });

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(() => undefined);
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useWeddingConfig(): WeddingConfig {
  return useContext(ConfigContext);
}

export function splitTitle(title: string): { left: string; right: string | null } {
  const marker = " i ";
  const index = title.indexOf(marker);
  if (index <= 0) return { left: title, right: null };
  return { left: title.slice(0, index), right: title.slice(index + marker.length) };
}
