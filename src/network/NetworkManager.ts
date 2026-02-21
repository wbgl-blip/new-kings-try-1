import Peer, { DataConnection, MediaConnection } from "peerjs";
import { NetworkMessage } from "../types";

type MessageHandler = (data: NetworkMessage, peerId: string) => void;
type StreamHandler = (stream: MediaStream, peerId: string) => void;

export class NetworkManager {
  private peer: Peer | null = null;

  private connections: Map<string, DataConnection> = new Map();
  private mediaConnections: Map<string, MediaConnection> = new Map();

  private messageHandlers: MessageHandler[] = [];
  private streamHandlers: StreamHandler[] = [];

  private hostConnection: DataConnection | null = null;

  public myPeerId: string = "";
  public localStream?: MediaStream;

  /* ======================================================
     MEDIA
  ====================================================== */

  async startLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.localStream = stream;
      return stream;
    } catch (e) {
      console.error("Failed to get local stream", e);
      throw e;
    }
  }

  /* ======================================================
     INIT
  ====================================================== */

  async initialize(requestedId?: string): Promise<string> {
    return new Promise((resolve) => {
      if (requestedId) {
        this.peer = new Peer(requestedId);
      } else {
        this.peer = new Peer();
      }

      this.peer.on("open", (id) => {
        this.myPeerId = id;
        console.log("PeerJS ready:", id);
        resolve(id);
      });

      this.peer.on("connection", (conn) => {
        this.handleConnection(conn);
      });

      this.peer.on("call", (call) => {
        this.handleCall(call);
      });

      this.peer.on("error", (err) => {
        console.error("PeerJS error:", err);
      });
    });
  }

  /* ======================================================
     CONNECT
  ====================================================== */

  connectToHost(hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) return reject("Peer not initialized");

      const conn = this.peer.connect(hostId, {
        reliable: true,
      });

      conn.on("open", () => {
        console.log("Connected to host:", hostId);

        this.hostConnection = conn;
        this.handleConnection(conn);

        resolve();
      });

      conn.on("error", (err) => {
        console.error("Connection error:", err);
        reject(err);
      });
    });
  }

  /* ======================================================
     DATA CONNECTIONS
  ====================================================== */

  private handleConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on("data", (data) => {
      const msg = data as NetworkMessage;

      // Fan out to listeners
      this.messageHandlers.forEach((h) => {
        try {
          h(msg, conn.peer);
        } catch (e) {
          console.error("Message handler error:", e);
        }
      });
    });

    conn.on("close", () => {
      console.log("Connection closed:", conn.peer);

      this.connections.delete(conn.peer);

      if (this.hostConnection?.peer === conn.peer) {
        this.hostConnection = null;
      }
    });

    conn.on("error", (err) => {
      console.error("DataConnection error:", err);
    });
  }

  /* ======================================================
     MEDIA CONNECTIONS
  ====================================================== */

  private async handleCall(call: MediaConnection) {
    try {
      const stream = await this.startLocalStream();

      call.answer(stream);

      call.on("stream", (remoteStream) => {
        this.streamHandlers.forEach((h) =>
          h(remoteStream, call.peer)
        );
      });

      call.on("close", () => {
        this.mediaConnections.delete(call.peer);
      });

      this.mediaConnections.set(call.peer, call);
    } catch (err) {
      console.error("Call failed:", err);
      call.answer();
    }
  }

  callPeer(peerId: string, stream: MediaStream) {
    if (!this.peer) return;

    const call = this.peer.call(peerId, stream);

    call.on("stream", (remoteStream) => {
      this.streamHandlers.forEach((h) =>
        h(remoteStream, peerId)
      );
    });

    call.on("close", () => {
      this.mediaConnections.delete(peerId);
    });

    this.mediaConnections.set(peerId, call);
  }

  /* ======================================================
     MESSAGING
  ====================================================== */

  broadcast(message: NetworkMessage) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  sendToHost(message: NetworkMessage) {
    if (this.hostConnection?.open) {
      this.hostConnection.send(message);
    }
  }

  /* ======================================================
     LISTENERS
  ====================================================== */

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);

    return () => {
      this.messageHandlers = this.messageHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  onStream(handler: StreamHandler) {
    this.streamHandlers.push(handler);

    return () => {
      this.streamHandlers = this.streamHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  /* ======================================================
     CLEANUP
  ====================================================== */

  cleanup() {
    try {
      this.peer?.destroy();
    } catch {}

    this.connections.clear();
    this.mediaConnections.clear();

    this.messageHandlers = [];
    this.streamHandlers = [];

    this.hostConnection = null;
    this.peer = null;
    this.localStream = undefined;

    console.log("Network cleaned up");
  }
}

export const networkManager = new NetworkManager();
