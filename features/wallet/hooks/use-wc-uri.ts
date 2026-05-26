"use client";

import { useEffect, useState } from "react";
import { useConfig } from "wagmi";

export function useWcUri() {
  const [uri, setUri] = useState<string | null>(null);
  const config = useConfig();

  useEffect(() => {
    const wcConnector = config.connectors.find((c) => c.id === "walletConnect");
    if (!wcConnector) return;

    const handleMessage = (payload: {
      type: string;
      data?: unknown;
      uid: string;
    }) => {
      if (payload.type === "display_uri" && typeof payload.data === "string") {
        setUri(payload.data);
      }
    };

    wcConnector.emitter.on("message", handleMessage);
    return () => {
      wcConnector.emitter.off("message", handleMessage);
    };
  }, [config.connectors]);

  return { uri, clearUri: () => setUri(null) };
}
