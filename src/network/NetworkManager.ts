import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { NetworkMessage } from '../types';

type MessageHandler = (data: NetworkMessage, peerId: string) => void;
type StreamHandler = (stream: MediaStream, peerId: string) => void;

export class NetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // peerId -> Connection
  private mediaConnections: Map<string, MediaConnection> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private streamHandlers: StreamHandler[] = [];
  private hostConnection: DataConnection | null = null;
  
  public myPeerId: string = '';
  public localStream: MediaStream | undefined;

  constructor() {}

  async startLocalStream(): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.localStream = stream;
        return stream;
    } catch (e) {
        console.error("Failed to get local stream", e);
        throw e;
    }
  }

  async initialize(requestedId?: string): Promise<string> {
    return new Promise((resolve) => {
      // Use a public peerjs server or local if configured. 
      // For this demo, we use the default public cloud peerjs server.
      if (requestedId) {
        this.peer = new Peer(requestedId);
      } else {
        this.peer = new Peer();
      }

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        console.log('PeerJS initialized with ID:', id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });

      this.peer.on('call', (call) => {
        this.handleCall(call);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        // reject(err); // Only reject if initial setup fails
      });
    });
  }

  connectToHost(hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) return reject('Peer not initialized');

      const conn = this.peer.connect(hostId, { reliable: true });

      conn.on('open', () => {
        this.hostConnection = conn;
        this.handleConnection(conn);
        resolve();
      });

      conn.on('error', (err) => {
        reject(err);
      });
    });
  }

  private handleConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('data', (data) => {
      this.messageHandlers.forEach(h => h(data as NetworkMessage, conn.peer));
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.hostConnection?.peer === conn.peer) {
        this.hostConnection = null;
        // Trigger host migration or disconnect logic here via handlers
      }
    });
  }

  private handleCall(call: MediaConnection) {
    // Answer calls automatically for now, or wait for local stream
    // We will assume we answer when we have a stream, handled by UI logic usually
    // But for auto-answer:
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          this.streamHandlers.forEach(h => h(remoteStream, call.peer));
        });
      })
      .catch(err => {
        console.error('Failed to get local stream to answer call', err);
        // Answer audio only or nothing?
        call.answer(); 
      });
      
      this.mediaConnections.set(call.peer, call);
  }

  callPeer(peerId: string, stream: MediaStream) {
    if (!this.peer) return;
    const call = this.peer.call(peerId, stream);
    this.mediaConnections.set(peerId, call);
    call.on('stream', (remoteStream) => {
      this.streamHandlers.forEach(h => h(remoteStream, peerId));
    });
  }

  broadcast(message: NetworkMessage) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(message);
    });
  }

  sendToHost(message: NetworkMessage) {
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(message);
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onStream(handler: StreamHandler) {
    this.streamHandlers.push(handler);
    return () => {
      this.streamHandlers = this.streamHandlers.filter(h => h !== handler);
    };
  }

  cleanup() {
    this.peer?.destroy();
    this.connections.clear();
    this.mediaConnections.clear();
  }
}

export const networkManager = new NetworkManager();
