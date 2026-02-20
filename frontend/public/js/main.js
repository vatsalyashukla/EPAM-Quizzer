import SignalingClient from "./api/signalingClient.js";
import HostController from "./host/hostController.js";
import ParticipantController from "./participant/participantController.js";
import UIManager from "./ui/uiManager.js";

/**
 * Main application
 */
class App {
  constructor() {
    this.uiManager = new UIManager();

    // Default to localhost or existing session URL
    const sessionUrl = sessionStorage.getItem("quizzer_server_url");
    // If running on localhost (dev), default to localhost:3000
    // If running on a domain (ngrok/localtunnel), default to that domain (origin)
    const defaultUrl =
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : window.location.origin;

    const initialUrl =
      "https://p01--backend--95bmd4c7jzbm.code.run" || defaultUrl;

    console.log("[App] Initializing with server URL:", initialUrl);
    this.signalingClient = new SignalingClient(initialUrl);

    this.hostController = null;
    this.participantController = null;

    this.initializeEventListeners();
  }

  /**
   * Connect to server with fallback to user input
   */
  /**
   * Connect to server with fallback to user input
   */
  async connectToServer() {
    try {
      if (this.signalingClient.isConnected()) return;

      this.uiManager.showLoading("Connecting to server...");
      await this.signalingClient.connect();
      this.uiManager.hideLoading();
    } catch (error) {
      this.uiManager.hideLoading();
      console.log("Connection failed, prompting user...");

      const newUrl = this.uiManager.getServerUrlInput(true); // Force prompt
      if (newUrl) {
        this.uiManager.showLoading("Connecting to new URL...");
        try {
          await this.signalingClient.connect(newUrl);
        } catch (e) {
          throw e; // Rethrow to be caught by caller
        } finally {
          this.uiManager.hideLoading();
        }
      } else {
        throw new Error("No server URL provided");
      }
    }
  }

  /**
   * Initialize UI event listeners
   */
  initializeEventListeners() {
    document
      .getElementById("hostBtn")
      .addEventListener("click", () => this.selectHostRole());
    document
      .getElementById("participantBtn")
      .addEventListener("click", () => this.selectParticipantRole());

    document
      .getElementById("hostStartBtn")
      .addEventListener("click", () => this.hostStartRound());

    document
      .getElementById("participantJoinBtn")
      .addEventListener("click", () => this.participantJoin());
    document
      .getElementById("participantBuzzBtn")
      .addEventListener("click", () => this.participantBuzz());

    document.addEventListener("keydown", (event) =>
      this.handleParticipantSpacebar(event),
    );

    document.getElementById("changeServerBtn").addEventListener("click", () => {
      this.uiManager.changeServerUrl();
    });
  }

  /**
   * Select host role
   */
  async selectHostRole() {
    try {
      const userData = await this.uiManager.getHostNameInput();
      if (!userData || !userData.name) return;

      const hostName = userData.team
        ? `${userData.name} (${userData.team})`
        : userData.name;

      const roomId = this.uiManager.getHostRoomIdInput();

      await this.connectToServer();

      this.hostController = new HostController(this.signalingClient);

      this.hostController.on("roomCreated", (room) => {
        this.uiManager.showHostScreen();
        this.uiManager.updateHostRoom(room.id, hostName);
      });

      this.hostController.on("participantJoined", (data) => {
        const info = this.hostController.getRoomInfo();
        this.uiManager.updateHostParticipants(info.participants);
        this.uiManager.updateHostStatus(
          `${info.participantCount} participant(s) connected`,
        );
      });

      this.hostController.on("participantLeft", (data) => {
        const info = this.hostController.getRoomInfo();
        this.uiManager.updateHostParticipants(info.participants);
        this.uiManager.updateHostStatus(
          `${info.participantCount} participant(s) connected`,
        );
      });

      this.hostController.on("buzzesUpdated", (buzzes) => {
        this.uiManager.updateHostBuzzList(buzzes);
        this.uiManager.updateHostParticipants(
          this.hostController.getRoomInfo().participants,
        );
      });

      this.hostController.on("roundStarted", () => {
        this.uiManager.resetHostRoundUI();
        this.uiManager.updateHostStatus("Round active - waiting for buzz");
        this.uiManager.updateHostBuzzList(null);
        this.uiManager.updateHostParticipants(
          this.hostController.getRoomInfo().participants,
        );
      });

      await this.hostController.createRoom(hostName, roomId);
    } catch (error) {
      this.uiManager.showError(error.message);
      console.error("[App] Error selecting host role:", error);
    }
  }

  /**
   * Select participant role
   */
  async selectParticipantRole() {
    try {
      // Get participant name and team first
      const userData = await this.uiManager.getHostNameInput();
      if (!userData || !userData.name) return;

      const participantName = userData.team
        ? `${userData.name} (${userData.team})`
        : userData.name;

      // Store for later use
      this.participantData = {
        name: participantName,
        rawName: userData.name,
        team: userData.team || "",
      };

      await this.connectToServer();

      this.participantController = new ParticipantController(
        this.signalingClient,
      );

      this.participantController.on("joinedRoom", (room) => {
        this.uiManager.showParticipantScreen();
        this.uiManager.showParticipantBuzzer(participantName);
        // Buzzer is disabled until round starts
        this.uiManager.setParticipantBuzzButtonState(false, false, true);
        this.uiManager.updateParticipantStatus(
          "Connected - waiting for round to start",
        );
      });

      this.participantController.on("roundStarted", () => {
        this.uiManager.setParticipantBuzzButtonState(true, false, false);
        this.uiManager.updateParticipantBuzzStatus(null);
        this.uiManager.updateParticipantStatus("Round active - Ready to buzz!");
      });

      this.participantController.on("buzzed", () => {
        this.uiManager.setParticipantBuzzButtonState(false, true, false);
        this.uiManager.updateParticipantStatus("You buzzed!");
      });

      this.participantController.on("buzzesUpdated", (data) => {
        this.uiManager.updateParticipantBuzzStatus(data);
        this.uiManager.updateParticipantStatus(
          data.myState.isWinner
            ? "You are the winner!"
            : data.myState.isBuzzed
              ? `You buzzed (Rank #${data.myState.rank})`
              : `${data.winnerName} buzzed first`,
        );
      });

      this.participantController.on("hostLeft", () => {
        this.uiManager.showError("Host disconnected");
        this.uiManager.showRoleScreen();
      });

      // Show participant screen with join form
      this.uiManager.showParticipantScreen();
      // Pre-fill the name field
      this.uiManager.setParticipantNameValue(participantName);
    } catch (error) {
      this.uiManager.showError(error.message);
      console.error("[App] Error selecting participant role:", error);
    }
  }

  /**
   * Host start round
   */
  async hostStartRound() {
    try {
      this.uiManager.setHostStartButtonEnabled(false);
      await this.hostController.startRound();
      this.uiManager.setHostStartButtonEnabled(true);
    } catch (error) {
      this.uiManager.showError(error.message);
      this.uiManager.setHostStartButtonEnabled(true);
    }
  }

  /**
   * Participant join room
   */
  async participantJoin() {
    try {
      const { roomId, name } = this.uiManager.getParticipantInputs();

      if (!roomId) {
        this.uiManager.showError("Please enter room ID");
        return;
      }

      if (!name) {
        this.uiManager.showError("Please enter your name");
        return;
      }

      this.uiManager.setParticipantJoinButtonEnabled(false);
      await this.participantController.joinRoom(roomId, name);
      this.uiManager.setParticipantJoinButtonEnabled(true);
    } catch (error) {
      this.uiManager.showError(error.message);
      this.uiManager.setParticipantJoinButtonEnabled(true);
    }
  }

  /**
   * Participant buzz
   */
  async participantBuzz() {
    try {
      const success = await this.participantController.buzz();
      if (!success) {
        this.uiManager.showError("Cannot buzz now");
      }
    } catch (error) {
      this.uiManager.showError(error.message);
    }
  }

  /**
   * Handle spacebar buzz for participants
   */
  async handleParticipantSpacebar(event) {
    // Anti-cheat: Only accept real physical key presses, not synthetic JS events
    if (!event.isTrusted) return;
    if (event.code !== "Space" || event.repeat) return;

    if (!this.participantController) return;

    const target = event.target;
    const isEditableTarget =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    if (isEditableTarget) return;

    // Always prevent spacebar scrolling on the participant page
    event.preventDefault();

    const status = this.participantController.getStatus();
    const canBuzz =
      status.roundStarted && !status.buzzerLocked && !status.hasLocalBuzzed;

    if (!canBuzz) return;

    await this.participantBuzz();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Anti-cheat: Do NOT expose app on window to prevent console access
  // e.g. window.app.participantController.buzz() would bypass all UI checks
  const app = new App();
  console.log("[App] Application initialized");
});
