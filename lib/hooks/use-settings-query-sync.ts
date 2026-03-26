import type { ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import type { WorkspaceSettingsSection } from "@/types/workspace";

interface UseSettingsQuerySyncOptions {
  searchParams: URLSearchParams | ReadonlyURLSearchParams;
  pathname: string;
  replace: (href: string) => void;
  activeSection: WorkspaceSettingsSection;
  setActiveSection: (section: WorkspaceSettingsSection) => void;
}

function isSettingsSection(
  value: string | null
): value is WorkspaceSettingsSection {
  return (
    value === "chains" ||
    value === "multisigs" ||
    value === "registry" ||
    value === "labels"
  );
}

export function useSettingsQuerySync({
  searchParams,
  pathname,
  replace,
  activeSection,
  setActiveSection,
}: UseSettingsQuerySyncOptions) {
  const lastWrittenQueryRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (lastWrittenQueryRef.current === currentQuery) {
      lastWrittenQueryRef.current = null;
      return;
    }

    if (hasHydratedRef.current) {
      return;
    }

    const requestedSection = searchParams.get("section");
    if (isSettingsSection(requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [searchParams, setActiveSection]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("section", activeSection);

    const nextQuery = nextParams.toString();
    if (nextQuery !== searchParams.toString()) {
      lastWrittenQueryRef.current = nextQuery;
      replace(`${pathname}?${nextQuery}`);
    }
  }, [activeSection, pathname, replace, searchParams]);

  useEffect(() => {
    hasHydratedRef.current = true;
  }, []);
}
