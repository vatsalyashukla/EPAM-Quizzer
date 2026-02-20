/**
 * UI Manager
 * Handles all UI updates and interactions
 */
class UIManager {
  constructor() {
    this.currentRole = null;
    this.elements = {};
    this.storageNamespace = 'quizzer_user_cache_v1';
    this.storageExpiryMs = 60 * 24 * 60 * 60 * 1000; // 60 days
    this.initializeElements();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    // Screens
    this.elements.roleScreen = document.getElementById('roleScreen');
    this.elements.hostScreen = document.getElementById('hostScreen');
    this.elements.participantScreen = document.getElementById('participantScreen');

    // Modal elements
    this.elements.nameTeamModal = document.getElementById('nameTeamModal');
    this.elements.modalNameInput = document.getElementById('modalNameInput');
    this.elements.modalTeamInput = document.getElementById('modalTeamInput');
    this.elements.modalSubmitBtn = document.getElementById('modalSubmitBtn');
    this.elements.modalCancelBtn = document.getElementById('modalCancelBtn');

    // Host elements
    this.elements.hostRoomId = document.getElementById('hostRoomId');
    this.elements.hostHostName = document.getElementById('hostHostName');
    this.elements.hostStartBtn = document.getElementById('hostStartBtn');
    this.elements.hostTopThreeList = document.getElementById('hostTopThreeList');
    this.elements.hostParticipantsList = document.getElementById('hostParticipantsList');
    this.elements.hostWinnerDisplay = document.getElementById('hostWinnerDisplay');
    this.elements.hostStatus = document.getElementById('hostStatus');

    // Participant elements
    this.elements.participantRoomIdInput = document.getElementById('participantRoomIdInput');
    this.elements.participantNameInput = document.getElementById('participantNameInput');
    this.elements.participantJoinBtn = document.getElementById('participantJoinBtn');
    this.elements.participantBuzzBtn = document.getElementById('participantBuzzBtn');
    this.elements.participantSpaceHint = document.getElementById('participantSpaceHint');
    this.elements.participantWinnerDisplay = document.getElementById('participantWinnerDisplay');
    this.elements.participantStatus = document.getElementById('participantStatus');
    this.elements.participantTopThreeContainer = document.getElementById('participantTopThreeContainer');
    this.elements.joinSection = document.getElementById('joinSection');
    this.elements.buzzerSection = document.getElementById('buzzerSection');
  }

  /**
   * Show role selection screen
   */
  showRoleScreen() {
    this.hideAllScreens();
    this.elements.roleScreen.style.display = 'block';
  }

  /**
   * Show host screen
   */
  showHostScreen() {
    this.hideAllScreens();
    this.elements.hostScreen.style.display = 'block';
    this.currentRole = 'host';
  }

  /**
   * Show participant screen
   */
  showParticipantScreen() {
    this.hideAllScreens();
    this.elements.participantScreen.style.display = 'block';
    this.elements.joinSection.style.display = 'block';
    this.elements.buzzerSection.style.display = 'none';
    this.currentRole = 'participant';

    // Prefill from saved participant data if available
    const savedParticipant = this.getStoredValue('participant');
    if (savedParticipant) {
      if (savedParticipant.roomId) {
        this.elements.participantRoomIdInput.value = savedParticipant.roomId;
      }
      if (savedParticipant.name) {
        this.elements.participantNameInput.value = savedParticipant.name;
      }
    }
  }

  /**
   * Hide all screens
   */
  hideAllScreens() {
    this.elements.roleScreen.style.display = 'none';
    this.elements.hostScreen.style.display = 'none';
    this.elements.participantScreen.style.display = 'none';
  }

  /**
   * Update host room display
   */
  updateHostRoom(roomId, hostName) {
    this.elements.hostRoomId.textContent = roomId;
    this.elements.hostHostName.textContent = hostName;
    this.updateHostStatus('Ready for participants');
  }

  /**
   * Update host participants list
   */
  updateHostParticipants(participants) {
    if (participants.length === 0) {
      this.elements.hostParticipantsList.innerHTML =
        '<div class="empty-message">No participants yet</div>';
      return;
    }

    // Group participants by team
    const teams = {};
    const noTeam = [];

    participants.forEach((p) => {
      // Extract team from name if in format "Name (Team)"
      const teamMatch = p.name.match(/\(([^)]+)\)$/);
      const teamName = teamMatch ? teamMatch[1] : null;

      if (teamName) {
        if (!teams[teamName]) {
          teams[teamName] = [];
        }
        teams[teamName].push(p);
      } else {
        noTeam.push(p);
      }
    });

    let html = '';

    // Render teams
    Object.keys(teams).sort().forEach((teamName) => {
      html += `
        <div class="team-section">
          <div class="team-header">${teamName}</div>
          <div class="team-members">
      `;

      teams[teamName].forEach((p) => {
        let statusBadge = 'waiting';
        let statusText = 'Waiting';

        if (p.rank) {
          if (p.winner) {
            statusBadge = 'winner';
            statusText = `#${p.rank} Winner`;
          } else {
            statusBadge = 'buzzed';
            statusText = `#${p.rank} Buzzed`;
          }
        } else if (p.buzzed) {
          statusBadge = 'buzzed';
          statusText = 'Buzzed';
        }

        // Remove team name from display
        const displayName = p.name.replace(/\s*\([^)]+\)$/, '');

        html += `
          <div class="participant-item">
            <span class="participant-name">${displayName}</span>
            <span class="participant-status ${statusBadge}">${statusText}</span>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    // Render participants without teams
    if (noTeam.length > 0) {
      if (Object.keys(teams).length > 0) {
        html += `
          <div class="team-section">
            <div class="team-header">Individual Participants</div>
            <div class="team-members">
        `;
      }

      noTeam.forEach((p) => {
        let statusBadge = 'waiting';
        let statusText = 'Waiting';

        if (p.rank) {
          if (p.winner) {
            statusBadge = 'winner';
            statusText = `#${p.rank} Winner`;
          } else {
            statusBadge = 'buzzed';
            statusText = `#${p.rank} Buzzed`;
          }
        } else if (p.buzzed) {
          statusBadge = 'buzzed';
          statusText = 'Buzzed';
        }

        html += `
          <div class="participant-item">
            <span class="participant-name">${p.name}</span>
            <span class="participant-status ${statusBadge}">${statusText}</span>
          </div>
        `;
      });

      if (Object.keys(teams).length > 0) {
        html += `
            </div>
          </div>
        `;
      }
    }

    this.elements.hostParticipantsList.innerHTML = html;

    // Update top 3 participants list
    this.updateTopThreeParticipants(participants);
  }

  /**
   * Update top 3 participants display
   */
  updateTopThreeParticipants(participants) {
    if (participants.length === 0) {
      this.elements.hostTopThreeList.innerHTML =
        '<div class="empty-state"><div class="empty-state-text">Waiting for participants to join...</div></div>';
      return;
    }

    // Sort by rank (buzzed participants have ranks, others don't)
    const buzzedParticipants = participants
      .filter(p => p.rank)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3);

    if (buzzedParticipants.length === 0) {
      this.elements.hostTopThreeList.innerHTML =
        '<div class="empty-state"><div class="empty-state-text">No one has buzzed yet...</div></div>';
      return;
    }

    let html = '<div class="top-three-container">';

    buzzedParticipants.forEach((p, index) => {
      // Extract team from name if in format "Name (Team)"
      const teamMatch = p.name.match(/\(([^)]+)\)$/);
      const teamName = teamMatch ? teamMatch[1] : 'No Team';
      const displayName = p.name.replace(/\s*\([^)]+\)$/, '');

      const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const statusText = p.winner ? 'WINNER' : `Rank #${p.rank}`;

      html += `
        <div class="top-three-item rank-${index + 1}">
          <div class="top-three-medal">${medalEmoji}</div>
          <div class="top-three-info">
            <div class="top-three-rank">Position ${index + 1}</div>
            <div class="top-three-name">${displayName}</div>
            <div class="top-three-team">${teamName}</div>
            <div class="top-three-status">${statusText}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    this.elements.hostTopThreeList.innerHTML = html;
  }

  /**
   * Update host status
   */
  updateHostStatus(status) {
    this.elements.hostStatus.textContent = status;
  }

  /**
   * Update host buzz list display
   */
  updateHostBuzzList(buzzes) {
    if (buzzes && buzzes.length > 0) {
      let html = '<div class="winner-content"><div class="winner-text">Buzzer Order</div></div><div class="buzz-list-container"><ol class="buzz-list">';

      buzzes.forEach((buzz, index) => {
        const isWinner = index === 0;
        const timeDiff = buzz.diff > 0 ? `+${(buzz.diff / 1000).toFixed(3)}s` : 'WINNER';
        const suspiciousIcon = buzz.suspicious ? ' <span class="suspicious-flag" title="Suspicious: ' + buzz.reactionTime + 'ms reaction time">⚠️</span>' : '';
        const reactionInfo = buzz.reactionTime != null ? ` <span class="reaction-time">(${buzz.reactionTime}ms)</span>` : '';

        html += `
            <li class="buzz-item ${isWinner ? 'winner' : ''} ${buzz.suspicious ? 'suspicious' : ''}">
              <span class="rank">#${index + 1}</span>
              <span class="name">${buzz.name}${suspiciousIcon}</span>
              <span class="time">${timeDiff}${reactionInfo}</span>
            </li>
          `;
      });

      html += '</ol></div>';

      this.elements.hostWinnerDisplay.innerHTML = html;
      this.elements.hostWinnerDisplay.classList.add('active');
    } else {
      this.elements.hostWinnerDisplay.innerHTML = '<div>Waiting for buzzer...</div>';
      this.elements.hostWinnerDisplay.classList.remove('active');
    }
  }

  /**
   * Reset host round visuals (top 3 + buzz list)
   */
  resetHostRoundUI() {
    this.elements.hostWinnerDisplay.innerHTML = '<div>Waiting for buzzer...</div>';
    this.elements.hostWinnerDisplay.classList.remove('active');

    this.elements.hostTopThreeList.innerHTML =
      '<div class="empty-state"><div class="empty-state-text">No one has buzzed yet...</div></div>';
  }

  /**
   * Enable/disable host start button
   */
  setHostStartButtonEnabled(enabled) {
    this.elements.hostStartBtn.disabled = !enabled;
  }

  /**
   * Show participant join form
   */
  showParticipantJoinForm() {
    this.elements.joinSection.style.display = 'block';
    this.elements.buzzerSection.style.display = 'none';
    this.elements.participantRoomIdInput.value = '';
    this.elements.participantNameInput.value = '';
  }

  /**
   * Show participant buzzer
   */
  showParticipantBuzzer(participantName) {
    this.elements.joinSection.style.display = 'none';
    this.elements.buzzerSection.style.display = 'block';
    this.elements.participantBuzzBtn.disabled = false;
    this.setParticipantBuzzButtonLabel('BUZZ!');
    this.updateParticipantStatus(`Connected as: ${participantName}`);
    this.updateParticipantBuzzStatus(null);
  }

  /**
   * Set participant name value
   */
  setParticipantNameValue(name) {
    this.elements.participantNameInput.value = name;
    this.elements.participantNameInput.readOnly = true;
    this.elements.participantNameInput.style.opacity = '0.7';
  }

  /**
   * Update participant status
   */
  updateParticipantStatus(status) {
    this.elements.participantStatus.textContent = status;
  }

  /**
   * Update participant buzz status
   */
  updateParticipantBuzzStatus(data) {
    if (data && data.myState.isBuzzed) {
      const myState = data.myState;
      if (myState.isWinner) {
        this.elements.participantWinnerDisplay.innerHTML = `
            <div class="winner-content">
              <div class="winner-emoji">★</div>
              <div class="winner-text">YOU WON!</div>
              <div class="rank-text">Rank #1</div>
            </div>
          `;
        this.setParticipantBuzzButtonLabel('You Buzzed First!');
      } else {
        this.elements.participantWinnerDisplay.innerHTML = `
            <div class="winner-content">
              <div class="winner-text">Rank #${myState.rank}</div>
              <div class="sub-text">Winner: ${data.winnerName}</div>
            </div>
          `;
        this.setParticipantBuzzButtonLabel(`Buzzed (#${myState.rank})`);
      }
      this.elements.participantWinnerDisplay.classList.add('active');
      this.elements.participantBuzzBtn.disabled = true;
    } else if (data) {
      // Someone else buzzed but I didn't (or I'm not in the list yet? theoretically impossible if locked=true and I haven't buzzed? 
      // actually if I haven't buzzed, I just see the winner)
      this.elements.participantWinnerDisplay.innerHTML = `
            <div class="winner-content">
              <div class="winner-text">${data.winnerName} buzzed first!</div>
            </div>
          `;
      this.elements.participantWinnerDisplay.classList.add('active');
      // Don't disable button here if we want to allow late buzzing? 
      // The requirement says "get sequence of the person who pushed afterwards". 
      // So we should NOT lock the button for me if I haven't buzzed.
      // Only lock if I have buzzed.
    } else {
      this.elements.participantWinnerDisplay.innerHTML = '<div>Waiting for host...</div>';
      this.elements.participantWinnerDisplay.classList.remove('active');
    }

    // Update top 3 participants display for participant view
    if (data && data.buzzes) {
      this.updateParticipantTopThreeList(data.buzzes);
    }
  }

  /**
   * Update top 3 participants display for participant view
   */
  updateParticipantTopThreeList(buzzes) {
    if (!buzzes || buzzes.length === 0) {
      this.elements.participantTopThreeContainer.innerHTML =
        '<div class="empty-state"><div class="empty-state-text">Waiting for buzzes...</div></div>';
      return;
    }

    // Get top 3 buzzes
    const topThreeBuzzes = buzzes.slice(0, 3);

    let html = '';

    topThreeBuzzes.forEach((buzz, index) => {
      // Extract team from name if in format "Name (Team)"
      const teamMatch = buzz.name.match(/\(([^)]+)\)$/);
      const teamName = teamMatch ? teamMatch[1] : 'No Team';
      const displayName = buzz.name.replace(/\s*\([^)]+\)$/, '');

      const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const timeDiff = buzz.diff > 0 ? `+${(buzz.diff / 1000).toFixed(3)}s` : 'FIRST';

      html += `
        <div class="top-three-item rank-${index + 1}">
          <div class="top-three-medal">${medalEmoji}</div>
          <div class="top-three-info">
            <div class="top-three-rank">Position ${index + 1}</div>
            <div class="top-three-name">${displayName}</div>
            <div class="top-three-team">${teamName}</div>
            <div class="top-three-status">${timeDiff}</div>
          </div>
        </div>
      `;
    });

    this.elements.participantTopThreeContainer.innerHTML = html;
  }

  /**
   * Set participant buzz button state
   */
  setParticipantBuzzButtonState(enabled, buzzed, locked) {
    this.elements.participantBuzzBtn.disabled = !enabled;

    const showSpaceHint = enabled && !locked && !buzzed;
    if (this.elements.participantSpaceHint) {
      this.elements.participantSpaceHint.style.display = showSpaceHint
        ? 'block'
        : 'none';
    }

    if (locked) {
      if (!enabled) {
        // Not enabled and locked - show "Waiting for round" message
        this.setParticipantBuzzButtonLabel('Waiting for Round');
      } else {
        // Enabled but locked - buzzer already used
        this.setParticipantBuzzButtonLabel('Locked');
      }
    } else if (buzzed) {
      this.setParticipantBuzzButtonLabel('Buzzed');
    } else {
      this.setParticipantBuzzButtonLabel('BUZZ!');
    }
  }

  /**
   * Set participant buzz button label with icon
   */
  setParticipantBuzzButtonLabel(label) {
    if (!this.elements.participantBuzzBtn) return;

    const button = this.elements.participantBuzzBtn;
    button.innerHTML = '';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'buzz-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.innerHTML = '&#128276;';

    const textSpan = document.createElement('span');
    textSpan.className = 'buzz-label';
    textSpan.textContent = label;

    button.appendChild(iconSpan);
    button.appendChild(textSpan);
  }

  /**
   * Show error message
   */
  showError(message) {
    alert(`Error: ${message}`);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    console.log('Success:', message);
  }

  /**
   * Show loading overlay
   */
  showLoading(message = 'Loading...') {
    // Check if overlay exists, if not create it
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      overlay.style.color = '#fff';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.zIndex = '9999';
      overlay.style.fontSize = '1.5rem';
      overlay.style.flexDirection = 'column';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div class="spinner" style="margin-bottom: 20px; font-size: 3rem;">...</div><div>${message}</div>`;
    overlay.style.display = 'flex';
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Get host name input
   */
  getHostNameInput() {
    return new Promise((resolve) => {
      const saved = this.getStoredValue('user');
      if (saved) {
        this.elements.modalNameInput.value = saved.name || '';
        this.elements.modalTeamInput.value = saved.team || '';
      }

      this.showNameTeamModal((name, team) => {
        this.setStoredValue('user', { name, team });
        resolve({ name, team });
      });
    });
  }

  /**
   * Show name and team modal
   */
  showNameTeamModal(callback) {
    // Keep any prefilled values (set before calling this method)
    this.elements.nameTeamModal.style.display = 'flex';
    this.elements.modalNameInput.focus();

    // Handle Enter key in inputs
    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.elements.modalSubmitBtn.click();
      }
    };

    this.elements.modalNameInput.addEventListener('keypress', handleEnter);
    this.elements.modalTeamInput.addEventListener('keypress', handleEnter);

    // Submit handler
    const submitHandler = () => {
      const name = this.elements.modalNameInput.value.trim();
      const team = this.elements.modalTeamInput.value.trim();

      if (!name) {
        alert('Please enter your name');
        this.elements.modalNameInput.focus();
        return;
      }

      // Convert team name to uppercase to avoid case-sensitivity issues
      const normalizedTeam = team.toUpperCase();

      this.hideNameTeamModal();
      this.elements.modalNameInput.removeEventListener('keypress', handleEnter);
      this.elements.modalTeamInput.removeEventListener('keypress', handleEnter);
      this.elements.modalSubmitBtn.removeEventListener('click', submitHandler);
      this.elements.modalCancelBtn.removeEventListener('click', cancelHandler);

      callback(name, normalizedTeam);
    };

    // Cancel handler
    const cancelHandler = () => {
      this.hideNameTeamModal();
      this.elements.modalNameInput.removeEventListener('keypress', handleEnter);
      this.elements.modalTeamInput.removeEventListener('keypress', handleEnter);
      this.elements.modalSubmitBtn.removeEventListener('click', submitHandler);
      this.elements.modalCancelBtn.removeEventListener('click', cancelHandler);
      callback(null, null);
    };

    this.elements.modalSubmitBtn.addEventListener('click', submitHandler);
    this.elements.modalCancelBtn.addEventListener('click', cancelHandler);
  }

  /**
   * Hide name and team modal
   */
  hideNameTeamModal() {
    this.elements.nameTeamModal.style.display = 'none';
  }

  /**
   * Get server URL from user or storage
   * @param {boolean} forcePrompt - Force a prompt even if saved
   */
  getServerUrlInput(forcePrompt = false) {
    if (!forcePrompt) {
      const savedUrl = sessionStorage.getItem('quizzer_server_url');
      if (savedUrl) {
        return savedUrl;
      }
    }

    let url = prompt('Connection failed. Please enter Server URL (e.g., https://your-ngrok-url.io):');
    if (!url) {
      return null;
    }

    // Remove trailing slash if present
    url = url.replace(/\/$/, "");

    sessionStorage.setItem('quizzer_server_url', url);
    return url;
  }

  /**
   * Change server URL and reload
   */
  changeServerUrl() {
    // Prompt immediately
    const url = prompt('Enter new Server URL (e.g., https://your-ngrok-url.io):');
    if (url) {
      // Save and reload
      const cleanUrl = url.replace(/\/$/, "");
      sessionStorage.setItem('quizzer_server_url', cleanUrl);
      window.location.reload();
    }
  }

  /**
   * Get host room ID input
   */
  getHostRoomIdInput() {
    const saved = this.getStoredValue('hostRoom');
    const input = prompt('Enter custom Room ID (optional, leave blank for random):', saved?.roomId || '');
    const roomId = input ? input.trim() : null;
    if (roomId) {
      this.setStoredValue('hostRoom', { roomId });
    }
    return roomId;
  }

  /**
   * Get participant inputs
   */
  getParticipantInputs() {
    const roomId = this.elements.participantRoomIdInput.value.trim();
    const name = this.elements.participantNameInput.value.trim();

    // Persist for convenience
    this.setStoredValue('participant', { roomId, name });

    return { roomId, name };
  }

  /**
   * localStorage helpers with expiry
   */
  setStoredValue(key, value) {
    try {
      const payload = {
        value,
        expires: Date.now() + this.storageExpiryMs,
      };
      localStorage.setItem(this.storageNamespace + ':' + key, JSON.stringify(payload));
    } catch (err) {
      console.warn('Storage set failed', err);
    }
  }

  getStoredValue(key) {
    try {
      const raw = localStorage.getItem(this.storageNamespace + ':' + key);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload.expires || payload.expires < Date.now()) {
        localStorage.removeItem(this.storageNamespace + ':' + key);
        return null;
      }
      return payload.value;
    } catch (err) {
      console.warn('Storage get failed', err);
      return null;
    }
  }

  /**
   * Enable/disable participant join button
   */
  setParticipantJoinButtonEnabled(enabled) {
    this.elements.participantJoinBtn.disabled = !enabled;
  }
}

export default UIManager;
