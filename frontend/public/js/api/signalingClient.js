/**
 * API Client for Socket.IO Communication
 * Handles all server communication
 */
class SignalingClient {
  constructor(serverUrl = "https://p01--backend--95bmd4c7jzbm.code.run") {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.listeners = new Map();
    this.requestCallbacks = new Map();
  }

  /**
   * Connect to signaling server
   */
  /**
   * Connect to signaling server
   */
  async connect(url = null) {
    if (url) {
      this.serverUrl = url;
    }

    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve(this.socket.id);
        return;
      }

      // Close existing if any
      if (this.socket) {
        this.socket.close();
      }

      try {
        console.log("[SignalingClient] Connecting to:", this.serverUrl);
        this.socket = io(this.serverUrl, {
          reconnection: false, // Reverting to manual control for stability
          timeout: 20000,
          extraHeaders: {
            "ngrok-skip-browser-warning": "true",
            "Bypass-Tunnel-Reminder": "true",
          },
        });

        this.socket.on("connect", () => {
          console.log("[SignalingClient] Connected", this.socket.id);
          this.setupDefaultListeners();
          resolve(this.socket.id);
        });

        this.socket.on("connect_error", (error) => {
          console.error("[SignalingClient] Connection error:", error.message);
          reject(error);
        });

        this.socket.on("disconnect", () => {
          console.log("[SignalingClient] Disconnected");
          this.emit("client:disconnected");
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Setup default event listeners
   */
  setupDefaultListeners() {
    console.log("[SignalingClient] Setting up default listeners");
    // Signaling events
    this.socket.on("signaling:receiveOffer", (data) => {
      this.emit("signaling:offer", data);
    });

    this.socket.on("signaling:receiveAnswer", (data) => {
      this.emit("signaling:answer", data);
    });

    this.socket.on("signaling:iceCandidate", (data) => {
      this.emit("signaling:iceCandidate", data);
    });

    // Buzzer events
    this.socket.on("buzzer:participantJoined", (data) => {
      this.emit("buzzer:participantJoined", data);
    });

    this.socket.on("buzzer:participantLeft", (data) => {
      this.emit("buzzer:participantLeft", data);
    });

    this.socket.on("buzzer:hostLeft", (data) => {
      this.emit("buzzer:hostLeft", data);
    });

    this.socket.on("buzzer:roundStarted", (data) => {
      this.emit("buzzer:roundStarted", data);
    });

    this.socket.on("buzzer:buzzesUpdated", (data) => {
      console.log("[SignalingClient] Received buzzesUpdated event", data);
      this.emit("buzzer:buzzesUpdated", data);
    });
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => callback(data));
    }
  }

  /**
   * Send event with callback
   */
  send(event, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Not connected"));
        return;
      }

      this.socket.emit(event, data, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || "Request failed"));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error("Request timeout"));
      }, 30000);
    });
  }

  // HOST OPERATIONS
  async hostCreateRoom(name, roomId = null) {
    return this.send("host:createRoom", { name, roomId });
  }

  async hostSendOffer(participantId, offer) {
    return this.send("host:sendOffer", { participantId, offer });
  }

  async hostReceiveAnswer(participantId, answer) {
    return this.send("host:receiveAnswer", { participantId, answer });
  }

  async hostAddIceCandidate(participantId, candidate) {
    return this.send("host:addIceCandidate", { participantId, candidate });
  }

  async hostStartRound() {
    return this.send("buzzer:startRound", {});
  }

  // PARTICIPANT OPERATIONS
  async participantJoinRoom(roomId, name) {
    return this.send("participant:joinRoom", { roomId, name });
  }

  async participantSendAnswer(hostId, answer) {
    return this.send("participant:sendAnswer", { hostId, answer });
  }

  async participantAddIceCandidate(hostId, candidate) {
    return this.send("participant:addIceCandidate", { hostId, candidate });
  }

  async participantBuzz(timestamp) {
    return this.send("buzzer:buzz", { timestamp });
  }

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

export default SignalingClient;
