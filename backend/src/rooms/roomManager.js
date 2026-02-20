import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import config from '../config/config.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import Room from './room.js';
import RoomRepository from './roomRepository.js';
import { normalizeTeamName } from './teamName.js';

class RoomManager {
  constructor(repo = new RoomRepository()) {
    this.repo = repo;
    this.startCleanup();
  }

  createRoom(customId = null) {
    let roomId = customId || this.randomId();
    while (this.repo.get(roomId)) roomId = this.randomId();
    if (customId && this.repo.get(roomId)) throw new ConflictError('Room ID already exists');
    const room = new Room(roomId);
    this.repo.add(room);
    logger.info('RoomManager', 'Room created', { roomId, isCustom: !!customId });
    return room;
  }

  getRoom(roomId) {
    const room = this.repo.get(roomId);
    if (!room) throw new NotFoundError('Room');
    return room;
  }

  getAllRooms() {
    return this.repo.list();
  }

  joinAsHost(roomId, host) {
    const room = this.getRoom(roomId);
    if (room.host) throw new ConflictError('Room already has a host');
    if (room.participants.size > 0) throw new ConflictError('Cannot join as host - participants already in room');
    room.host = { id: host.id, name: normalizeTeamName(host.name), joinedAt: Date.now() };
    this.repo.mapUser(host.id, roomId);
    room.touch();
    logger.info('RoomManager', 'Host joined room', { roomId, hostId: host.id });
    return room;
  }

  joinAsParticipant(roomId, participant) {
    const room = this.getRoom(roomId);
    if (!room.host) throw new ConflictError('Room has no host');
    if (room.participants.size >= config.maxParticipantsPerRoom) throw new ConflictError('Room is full');
    if (room.participants.has(participant.id)) throw new ConflictError('Participant already in room');
    room.participants.set(participant.id, {
      id: participant.id,
      name: normalizeTeamName(participant.name),
      joinedAt: Date.now(),
      buzzed: false,
    });
    this.repo.mapUser(participant.id, roomId);
    room.touch();
    logger.debug('RoomManager', 'Participant joined room', { roomId, participantId: participant.id, totalParticipants: room.participants.size });
    return room;
  }

  leaveRoom(userId) {
    const roomId = this.repo.getRoomIdByUser(userId);
    if (!roomId) return null;
    const room = this.repo.get(roomId);
    if (!room) {
      this.repo.clearUser(userId);
      return null;
    }
    if (room.host?.id === userId) {
      this.repo.remove(roomId);
      this.repo.clearMappingsForRoom(room);
      logger.info('RoomManager', 'Room deleted - host left', { roomId });
      return room;
    }
    if (room.participants.has(userId)) {
      room.participants.delete(userId);
      this.repo.clearUser(userId);
      room.touch();
      logger.debug('RoomManager', 'Participant left room', { roomId, userId, remainingParticipants: room.participants.size });
    }
    return room;
  }

  startRound(roomId) {
    const room = this.getRoom(roomId);
    room.resetRound();
    logger.debug('RoomManager', 'Round started', { roomId });
    return room;
  }

  recordBuzz(roomId, participantId) {
    const room = this.getRoom(roomId);

    // Anti-cheat: reject buzz if no round is active
    if (!room.roundActive) {
      logger.warn('RoomManager', 'Buzz rejected - no active round', { roomId, participantId });
      return { rejected: true, reason: 'No active round' };
    }

    const participant = room.participants.get(participantId);
    if (!participant) throw new NotFoundError('Participant');
    if (participant.buzzed) return { alreadyBuzzed: true, buzzes: room.buzzes };

    const timestamp = Date.now();
    participant.buzzed = true;
    const diff = room.buzzes.length === 0 ? 0 : timestamp - room.buzzes[0].timestamp;

    // Anti-cheat: calculate reaction time from round start
    const reactionTime = timestamp - room.roundStartedAt;
    const suspicious = reactionTime < 50; // <50ms is physically impossible for a human

    if (suspicious) {
      logger.warn('RoomManager', 'Suspicious buzz detected', {
        roomId, participantId, name: participant.name, reactionTime,
      });
    }

    room.buzzes.push({
      participantId, name: participant.name, timestamp, diff,
      reactionTime, suspicious,
    });

    const first = room.buzzes[0].timestamp;
    room.buzzes.forEach((b) => { b.diff = b.timestamp - first; });
    room.touch();
    logger.info('RoomManager', 'Buzz recorded', { roomId, participantId, buzzCount: room.buzzes.length, reactionTime, suspicious });
    return { buzzes: room.buzzes };
  }

  getParticipantUserIds(roomId) {
    return Array.from(this.getRoom(roomId).participants.keys());
  }

  startCleanup() {
    setInterval(() => {
      const idleRooms = this.repo.list().filter((room) => room.isIdle());
      idleRooms.forEach((room) => {
        logger.info('RoomManager', 'Cleaning up idle room', { roomId: room.id });
        this.repo.remove(room.id);
        this.repo.clearMappingsForRoom(room);
      });
    }, 60 * 1000);
  }

  randomId() {
    return uuidv4().substring(0, 8);
  }
}

export default new RoomManager();
