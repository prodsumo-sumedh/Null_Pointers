"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ChatMessage } from "@/lib/db";
import { getSignalingSocket } from "@/lib/webrtc";
import { syncSendChat } from "@/lib/syncClient";
import type { Socket } from "socket.io-client";

export interface AutoSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queuedCount: number;
  syncPendingMessages: () => Promise<number>;
  lastSyncedAt: Date | null;
}

export function useAutoSync(roomId?: string): AutoSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Reactive query of queued messages (filtered by roomId if provided, else all)
  const queuedMessages = useLiveQuery(
    async () => {
      try {
        if (!db.chatMessages) return [];
        if (roomId) {
          return await db.chatMessages
            .where("roomId")
            .equals(roomId)
            .and((m) => m.status === "queued")
            .toArray();
        }
        return await db.chatMessages.where("status").equals("queued").toArray();
      } catch (e) {
        console.error("[useAutoSync] Error querying queued chat messages:", e);
        return [];
      }
    },
    [roomId],
    []
  ) ?? [];

  const syncPendingMessages = useCallback(async (): Promise<number> => {
    if (typeof window === "undefined") return 0;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[useAutoSync] Device is offline; sync deferred.");
      return 0;
    }

    try {
      setIsSyncing(true);

      // Query all queued messages to sync
      const query = db.chatMessages.where("status").equals("queued");
      const pending = roomId ? await query.and((m) => m.roomId === roomId).toArray() : await query.toArray();

      if (pending.length === 0) {
        setIsSyncing(false);
        return 0;
      }

      console.log(`[useAutoSync] Starting sync of ${pending.length} queued messages...`);

      let syncedCount = 0;
      for (const msg of pending) {
        // 1. Sync through HTTP Serverless Sync API
        await syncSendChat(msg.roomId, msg.senderRole, msg.text, msg.timestamp);

        // 2. Also emit to socket if connected
        try {
          const socket = socketRef.current || getSignalingSocket();
          if (socket && socket.connected) {
            socket.emit("chat-message", {
              roomId: msg.roomId,
              senderRole: msg.senderRole,
              text: msg.text,
              status: "synced",
              timestamp: msg.timestamp,
              sender: msg.senderRole === "doctor" ? "डॉक्टर (Doctor)" : "आशा कार्यकर्ता (ASHA)",
              time: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            });
          }
        } catch {}

        // Mark as synced in Dexie IndexedDB
        if (msg.id) {
          await db.chatMessages.update(msg.id, { status: "synced" });
          syncedCount++;
        }
      }

      setLastSyncedAt(new Date());
      console.log(`[useAutoSync] Successfully synced ${syncedCount} queued messages.`);
      setIsSyncing(false);
      return syncedCount;
    } catch (err) {
      console.error("[useAutoSync] Error during background synchronization:", err);
      setIsSyncing(false);
      return 0;
    }
  }, [roomId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("[useAutoSync] Window online event detected. Initiating auto-sync...");
      setIsOnline(true);
      syncPendingMessages();
    };

    const handleOffline = () => {
      console.log("[useAutoSync] Window offline event detected.");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check on mount: if online and pending messages exist, sync them
    if (navigator.onLine) {
      setIsOnline(true);
      syncPendingMessages();
    } else {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingMessages]);

  return {
    isOnline,
    isSyncing,
    queuedCount: queuedMessages.length,
    syncPendingMessages,
    lastSyncedAt,
  };
}
