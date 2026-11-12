import { useEffect, useState } from "react";

/** The pages of the app. Explorer is the default. */
export type PageId = "explorer" | "compare" | "methodology";

export const PAGES: ReadonlyArray<{ id: PageId; label: string }> = [
  { id: "explorer", label: "Planetary Explorer" },
  { id: "compare", label: "Regional Compare" },
  { id: "methodology", label: "Data Sources & Methodology" },
];

/** "#/compare" -> "compare"; anything unknown -> "explorer". */
export function pageFromHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return PAGES.some((page) => page.id === id) ? (id as PageId) : "explorer";
}

export function hashForPage(page: PageId): string {
  return `#/${page}`;
}

/**
 * Current page from the URL hash (#/explorer, #/compare, #/methodology).
 * Hash links work without any server setup and with the browser Back button.
 */
export function useHashPage(): PageId {
  const [page, setPage] = useState<PageId>(() =>
    pageFromHash(typeof window === "undefined" ? "" : window.location.hash),
  );

  useEffect(() => {
    const onChange = () => {
      setPage(pageFromHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return page;
}
