import config from '../config/config.js';

export default class Room {
  constructor(roomId) {
    this.id = roomId;
    this.host = null;
    this.participants = new Map();
    this.buzzerLocked = false;
    this.buzzes = [];
    this.roundActive = false;
    this.roundStartedAt = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  isIdle() {
    return Date.now() - this.lastActivity > config.roomIdleTimeout;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  resetRound() {
    this.buzzerLocked = false;
    this.buzzes = [];
    this.roundActive = true;
    this.roundStartedAt = Date.now();
    this.participants.forEach((p) => {
      p.buzzed = false;
      p.winner = false;
      p.rank = null;
    });
    this.touch();
  }

  summary() {
    return {
      id: this.id,
      hostId: this.host?.id || null,
      participantCount: this.participants.size,
      buzzerLocked: this.buzzerLocked,
      buzzes: this.buzzes,
    };
  }

  getSummary() {
    return this.summary();
  }
}
