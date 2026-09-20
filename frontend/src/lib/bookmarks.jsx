import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./auth";
import { fetchWorkspace, toggleBookmarkApi } from "./api/workspaceClient";

const BookmarkContext = createContext({
  bookmarkedIds: new Set(),
  isBookmarked: () => false,
  toggleBookmark: async () => {},
  count: 0,
});

export function BookmarkProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const initial = user?.workspace?.bookmarkedStartupIds || [];
    return new Set(initial.map(String));
  });

  const refreshBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarkedIds(new Set());
      return;
    }
    try {
      const res = await fetchWorkspace();
      const list = res.workspace?.bookmarkedStartupIds || [];
      setBookmarkedIds(new Set(list.map(String)));
    } catch {
      // silent fallback
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    const handleSync = (e) => {
      if (e?.detail?.bookmarkedIds) {
        setBookmarkedIds(new Set(e.detail.bookmarkedIds.map(String)));
      }
    };
    window.addEventListener("nex:bookmarks_updated", handleSync);
    return () => window.removeEventListener("nex:bookmarks_updated", handleSync);
  }, []);

  const isBookmarked = useCallback(
    (id) => {
      if (!id) return false;
      return bookmarkedIds.has(String(id));
    },
    [bookmarkedIds],
  );

  const toggleBookmark = useCallback(
    async (id) => {
      if (!id) return;
      const strId = String(id);
      const currentlySaved = bookmarkedIds.has(strId);

      // Optimistic update
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) {
          next.delete(strId);
        } else {
          next.add(strId);
        }
        return next;
      });

      try {
        const res = await toggleBookmarkApi(strId);
        const serverList = res.bookmarkedStartupIds || [];
        setBookmarkedIds(new Set(serverList.map(String)));
        window.dispatchEvent(
          new CustomEvent("nex:bookmarks_updated", {
            detail: {
              id: strId,
              bookmarked: !currentlySaved,
              bookmarkedIds: serverList,
            },
          }),
        );
      } catch (err) {
        // Rollback on failure
        setBookmarkedIds((prev) => {
          const rollback = new Set(prev);
          if (currentlySaved) {
            rollback.add(strId);
          } else {
            rollback.delete(strId);
          }
          return rollback;
        });
        throw err;
      }
    },
    [bookmarkedIds],
  );

  const value = useMemo(
    () => ({
      bookmarkedIds,
      isBookmarked,
      toggleBookmark,
      count: bookmarkedIds.size,
    }),
    [bookmarkedIds, isBookmarked, toggleBookmark],
  );

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmarks() {
  return useContext(BookmarkContext);
}
