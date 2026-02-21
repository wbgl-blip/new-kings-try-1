import { useEffect, useState } from 'react';
import { networkManager } from '../network/NetworkManager';
import { useGameStore } from '../store/gameStore';

export const useMediaMesh = () => {
  const players = useGameStore(state => state.players);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});

  useEffect(() => {
    // Handle incoming streams
    const unsubscribe = networkManager.onStream((stream, peerId) => {
      setStreams(prev => ({ ...prev, [peerId]: stream }));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Handle outgoing calls to new players
    // We only call if we have a local stream and the player is not us
    if (!networkManager.localStream) return;

    players.forEach(player => {
      if (player.peerId === networkManager.myPeerId) return; // Don't call self
      if (streams[player.peerId]) return; // Already have stream

      // Check if we are already calling? networkManager tracks connections.
      // But we can just try to call. NetworkManager should probably dedupe or PeerJS handles it.
      // Better: Only call if we are "older" or some deterministic rule?
      // Or just everyone calls everyone and PeerJS handles busy state?
      // Simple mesh: A joins. A calls B, C, D. 
      // Existing B sees A in list. B could call A?
      // To avoid collision: Sort IDs. Lower ID calls Higher ID?
      
      const myId = networkManager.myPeerId;
      const theirId = player.peerId;
      
      if (myId < theirId && networkManager.localStream) {
         networkManager.callPeer(theirId, networkManager.localStream);
      }
    });
  }, [players, streams]);

  return streams;
};
