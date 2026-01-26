# EPAM Quizzer - Production-Ready WebRTC Quiz Buzzer System

A scalable, production-ready real-time quiz buzzer system using WebRTC with a Node.js backend and vanilla JavaScript frontend.

## 📋 Features

- **Real-time Communication**: WebRTC DataChannels for low-latency peer-to-peer messaging
- **Centralized Coordination**: Backend-driven signaling server using Socket.IO
- **Scalable Architecture**: Supports up to 25 participants per room
- **Clean Code**: Modular, maintainable codebase with clear separation of concerns
- **Production Ready**: Error handling, logging, configuration management
- **No External Dependencies**: Frontend uses only vanilla JavaScript

## 🏗️ Architecture

### Backend
- **Node.js + Express**: HTTP server and static file serving
- **Socket.IO**: Signaling server for WebRTC offer/answer exchange
- **Room Manager**: Manages quiz sessions and participant state
- **Buzzer Manager**: Determines winners based on message arrival order

### Frontend
- **Signaling Client**: Socket.IO wrapper for server communication
- **Peer Manager**: WebRTC peer connection management
- **Data Channel Manager**: Handles reliable data channel communication
- **Host Controller**: Host-side quiz logic
- **Participant Controller**: Participant-side quiz logic
- **UI Manager**: DOM manipulation and user interface

## 📁 Project Structure

```
EPAM-Quizzer/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── config.js           # Configuration management
│   │   ├── managers/
│   │   │   └── roomManager.js      # Room & participant state
│   │   ├── signaling/
│   │   │   ├── signalingServer.js  # WebRTC signaling
│   │   │   └── buzzerServer.js     # Buzzer logic
│   │   ├── server/
│   │   │   └── app.js              # Express app setup
│   │   ├── utils/
│   │   │   ├── logger.js           # Logging utility
│   │   │   └── errors.js           # Custom errors
│   │   └── index.js                # Entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html              # Main HTML
│   ├── src/
│   │   ├── css/
│   │   │   └── styles.css          # Global styles
│   │   └── js/
│   │       ├── main.js             # Application entry
│   │       ├── api/
│   │       │   └── signalingClient.js
│   │       ├── webrtc/
│   │       │   ├── peerManager.js
│   │       │   └── dataChannelManager.js
│   │       ├── host/
│   │       │   └── hostController.js
│   │       ├── participant/
│   │       │   └── participantController.js
│   │       └── ui/
│   │           └── uiManager.js
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start server**:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

The backend will start on `http://localhost:3000`

### Frontend Setup

1. **Start local server** (from frontend directory):
   ```bash
   # Using Python 3
   python -m http.server 8080
   
   # or using Node
   npx http-server -p 8080
   ```

2. **Open in browser**:
   - Navigate to `http://localhost:8080/public/index.html`

## 🎮 Usage

### Host Mode
1. Click "👑 HOST (Coordinator)"
2. Enter your name
3. Share the generated Room ID with participants
4. Wait for participants to join
5. Click "▶ Start Round" to begin
6. System shows the first participant to buzz

### Participant Mode
1. Click "🎯 PARTICIPANT (Buzzer)"
2. Enter Room ID (provided by host)
3. Enter your name
4. Click "Join Room"
5. Wait for host to start the round
6. Click the large "BUZZ!" button when ready
7. First to buzz wins!

## 🏗️ Clean Code Principles

### Separation of Concerns
- **Controllers**: Handle business logic
- **Managers**: Manage state and connections
- **UI Manager**: Handles all DOM interactions
- **Signaling Client**: Communicates with server

### Error Handling
- Custom error classes for different error types
- Proper error propagation and logging
- User-friendly error messages

### Configuration Management
- Centralized config from environment variables
- Frozen config object to prevent mutations
- Sensible defaults

### Logging
- Structured logging with context
- Different log levels (ERROR, WARN, INFO, DEBUG)
- Timestamped logs for debugging

## 📝 API Reference

### Server Events

#### Host Events
- `host:createRoom` - Create a new quiz room
- `host:sendOffer` - Send WebRTC offer to participant
- `host:receiveAnswer` - Receive answer from participant
- `host:addIceCandidate` - Exchange ICE candidates
- `buzzer:startRound` - Start a new buzzer round

#### Participant Events
- `participant:joinRoom` - Join an existing room
- `participant:sendAnswer` - Send WebRTC answer to host
- `participant:addIceCandidate` - Exchange ICE candidates
- `buzzer:buzz` - Signal a buzz attempt

### Client Events
- `buzzer:participantJoined` - Participant joined room
- `buzzer:roundStarted` - Round started
- `buzzer:winner` - Winner determined
- `signaling:offer` - Receive WebRTC offer
- `signaling:answer` - Receive WebRTC answer
- `signaling:iceCandidate` - Receive ICE candidate

## ⚙️ Configuration

Edit `backend/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:8080

# Logging
LOG_LEVEL=debug

# WebRTC
ICE_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

## 🔐 Key Design Decisions

1. **Backend-Driven Signaling**: Server maintains state, prevents manipulation
2. **Winner Determined by Host**: Host decides winner based on message arrival order
3. **No Client-Side Comparison**: Participants never compare timestamps
4. **Data Channel Priority**: After initial connection, messaging uses WebRTC DataChannel (lower latency)
5. **Automatic Room Cleanup**: Idle rooms are automatically removed

## 📊 Performance Considerations

- **Max Participants**: 25 per room (configurable)
- **Room Idle Timeout**: 5 minutes (configurable)
- **ICE Servers**: Multiple STUN servers for NAT traversal
- **Message Ordering**: Ordered DataChannel for reliable delivery

## 🐛 Debugging

### Server Logs
Set `LOG_LEVEL=debug` in `.env` for detailed logs

### Browser Console
- Check for JavaScript errors
- Monitor Socket.IO connection status
- Inspect WebRTC peer connections

### Debug Endpoint
- `GET /api/rooms` - View all active rooms and participants

## 🚢 Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use process manager (PM2, systemd, etc.)
3. Configure CORS for your frontend domain
4. Use environment variables for secrets

### Frontend
1. Build for production (if using build tool)
2. Deploy to static hosting (Netlify, Vercel, etc.)
3. Or serve from backend's static directory

## 📚 Technology Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Communication**: WebRTC, Socket.IO
- **Browser APIs**: RTCPeerConnection, RTCDataChannel

## 🤝 Contributing

1. Follow the code style and patterns
2. Add comments for complex logic
3. Test in multiple browsers
4. Update documentation

## 📄 License

MIT

## 🆘 Troubleshooting

### Connection Issues
- Check backend is running on correct port
- Verify CORS settings
- Check browser console for errors

### Buzzer Not Working
- Verify WebRTC connection established
- Check DataChannel status
- Inspect Network tab for Socket.IO events

### Participants Can't Join
- Verify Room ID is correct
- Check backend logs for errors
- Ensure host is connected

## 📞 Support

For issues or questions, check the logs and browser console for detailed error messages.

## For backend deployement