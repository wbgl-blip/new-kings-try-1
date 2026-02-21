import { useEffect, useRef, useState } from "react";
import { networkManager } from "../network/NetworkManager";
import { useGameStore } from "../store/gameStore";

/*
  Maintains peer-to-peer media mesh
  - Handles incoming streams
  - Initiates outgoing calls
  - Cleans up dead peers
*/

export const useMediaMesh = () => {
  const players = useGameStore((s) => s.players);

  const [streams, setStreams] = useState<Record<string, MediaStream>>({});

  // Track active calls to avoid duplicates
  const activeCalls = useRef<Set<string>>(new Set());

  /* ======================================================
     INCOMING STREAMS
  ====================================================== */

  useEffect(() => {
    const unsubscribe = networkManager.onStream(
      (stream, peerId) => {
        setStreams((prev) => ({
          ...prev,
          [peerId]: stream,
        }));

        activeCalls.current.add(peerId);
      }
    );

    return unsubscribe;
  }, []);

  /* ======================================================
     CLEANUP DISCONNECTED PEERS
  ====================================================== */

  useEffect(() => {
    setStreams((prev) => {
      const next: Record<string, MediaStream> = {};

      players.forEach((p) => {
        if (prev[p.peerId]) {
          next[p.peerId] = prev[p.peerId];
        }
      });

      return next;
    });

    // Clean call registry
    const validIds = new Set(players.map((p) => p.peerId));

    activeCalls.current.forEach((id) => {
      if (!validIds.has(id)) {
        activeCalls.current.delete(id);
      }
    });
  }, [players]);

  /* ======================================================
     OUTGOING CALLS
  ====================================================== */

  useEffect(() => {
    const stream = networkManager.localStream;
    const myId = networkManager.myPeerId;

    if (!stream || !myId) return;

    players.forEach((player) => {
      const peerId = player.peerId;

      if (!peerId) return;
      if (peerId === myId) return;

      // Already connected
      if (streams[peerId]) return;

      // Already calling
      if (activeCalls.current.has(peerId)) return;

      /*
        Deterministic caller rule:
        Lower peerId calls higher peerId
        Prevents double calls
      */
      if (myId < peerId) {
        activeCalls.current.add(peerId);

        networkManager.callPeer(peerId, stream);
      }
    });
  }, [players, streams]);

  /* ======================================================
     RESET ON ROOM CHANGE
  ====================================================== */

  useEffect(() => {
    if (players.length === 0) {
      setStreams({});
      activeCalls.current.clear();
    }
  }, [players.length]);

  return streams;
};
