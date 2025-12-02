// =========================
// Firebase config
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyAN7IrOQfHYJAeO49I1EZxDfupv62Ew9XI",
  authDomain: "madiko-rs.firebaseapp.com",
  databaseURL: "https://madiko-rs-default-rtdb.firebaseio.com",
  projectId: "madiko-rs",
  storageBucket: "madiko-rs.appspot.com",
  messagingSenderId: "746083664475",
  appId: "1:746083664475:web:fe2d5628d20e385d06b57e",
  measurementId: "G-EBWFWCMWFT"
};

firebase.initializeApp(firebaseConfig);

// =========================
// State global
// =========================
let db = null;              // ref sur rooms/<roomName>
let username = null;
let roomName = null;
let replyMessageId = null;
let replyMessageText = "";
let messageListener = null;
let childRemovedListenerSet = false;
let passwordValue = "";
let isDark = true;

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

// Thèmes light/dark
const lightTheme = {
  '--bg-color': '#ffffff',
  '--text-color': '#1a1a1a',
  '--accent-color': '#0055ff',
  '--button-bg': '#dddddd',
  '--button-hover-bg': '#cccccc',
  '--bubble-user1': 'linear-gradient(135deg, #1976d2, #90caf9)',
  '--bubble-user2': '#e0e0e0'
};

const darkTheme = {
  '--bg-color': '#1f1f1f',
  '--text-color': '#ffffff',
  '--accent-color': '#ffd700',
  '--button-bg': '#5a5a5a',
  '--button-hover-bg': '#4c4c4c',
  '--bubble-user1': 'linear-gradient(135deg, #4e54c8, #8f94fb)',
  '--bubble-user2': '#3a3a3a'
};

// Thèmes bulles
const themes = {
  default: {
    '--bubble-user1': 'linear-gradient(135deg, #4e54c8, #8f94fb)',
    '--bubble-user2': '#3a3a3a'
  },
  ocean: {
    '--bubble-user1': 'linear-gradient(135deg, #2193b0, #6dd5ed)',
    '--bubble-user2': '#145374'
  },
  forest: {
    '--bubble-user1': 'linear-gradient(135deg, #388e3c, #a5d6a7)',
    '--bubble-user2': '#2e7d32'
  },
  rosewood: {
    '--bubble-user1': 'linear-gradient(135deg, #a83279, #d38312)',
    '--bubble-user2': '#502336'
  },
  noir: {
    '--bubble-user1': 'linear-gradient(135deg, #434343, #000000)',
    '--bubble-user2': '#1e1e1e'
  },
  midnight: {
    '--bubble-user1': 'linear-gradient(135deg, #1c92d2, #f2fcfe)',
    '--bubble-user2': '#172d51'
  },
  sepia: {
    '--bubble-user1': 'linear-gradient(135deg, #a2836e, #e6ccb2)',
    '--bubble-user2': '#5a463b'
  },
  galaxy: {
    '--bubble-user1': 'linear-gradient(135deg, #4a00e0, #8e2de2)',
    '--bubble-user2': '#2a2438'
  }
};

// Emojis
const emojis = ["😀", "😂", "😍", "😎", "😊", "😢", "😡", "👍", "👎", "🎉", "❤️", "🔥"];

// =========================
// DOM ready
// =========================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOMContentLoaded");

  const loginContainer = document.getElementById("login-container");
  const chatScreen = document.querySelector(".screen-chat");
  const chatContainer = document.getElementById("chat-container");
  const loginBtn = document.querySelector(".login-button");
  const messageInput = document.getElementById("message-input");
  const themeToggle = document.getElementById("theme-toggle");
  const themeSelect = document.getElementById("theme-select");
  const imageInput = document.getElementById("image-input");

  // Login avec Enter
  if (loginContainer) {
    loginContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        loginBtn?.click();
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      joinRoom();
    });
  }

  // Envoi message avec Enter
  if (messageInput) {
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Dark / Light toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const theme = isDark ? lightTheme : darkTheme;
      Object.entries(theme).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
      themeToggle.textContent = isDark ? "☀️" : "🌙";
      isDark = !isDark;
    });
  }

  // Sélecteur de thème bulles
  if (themeSelect) {
    themeSelect.addEventListener("change", handleThemeChange);
  }

  // Input image
  if (imageInput) {
    imageInput.addEventListener("change", handleImageUpload);
  }

  // Emojis
  loadEmojis();

  // Popup image
  initImagePopup();

  // Reset titre onglet quand on revient
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      document.title = "Votre Chat";
      notificationSound.pause();
      notificationSound.currentTime = 0;
    }
  });

  // Mise à jour des timestamps toutes les 60s
  setInterval(updateAllTimestamps, 60000);

  // Avant fermeture
  window.addEventListener("beforeunload", () => {
    if (roomName && username) {
      firebase.database().ref(`rooms/${roomName}/onlineUsers/${username}`).remove();
    }
  });

  // On masque l'écran chat au départ
  if (chatScreen) chatScreen.classList.add("hidden");
  if (chatContainer) chatContainer.classList.add("hidden");
});

// =========================
// Notification
// =========================
function showNotification() {
  const notification = document.getElementById("notification");
  if (!notification) return;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

// =========================
// Auth / Room
// =========================
function joinRoom() {
  username = document.getElementById("username").value.trim();
  roomName = document.getElementById("room-name-input").value.trim();
  const password = document.getElementById("password-input").value.trim();
  passwordValue = password;

  if (!username || !roomName || !password) {
    alert("Tous les champs sont obligatoires.");
    return;
  }

  const roomRef = firebase.database().ref(`rooms/${roomName}`);
  const onlineUserRef = roomRef.child("onlineUsers").child(username);

  // Vérifier si pseudo déjà pris dans cette room
  onlineUserRef.once("value").then((snapUser) => {
    if (snapUser.exists()) {
      alert("Ce pseudo est déjà utilisé dans ce lieu !");
      return;
    }

    // On pointe db sur rooms/<roomName>
    db = roomRef;

    db.once("value").then((snapshot) => {
      if (snapshot.exists()) {
        const dbPassword = snapshot.child("password").val();
        if (dbPassword === password) {
          enterChat();
        } else {
          alert("Mot de passe incorrect !");
        }
      } else {
        // Créer la room
        db.set({
          password: password,
          messages: {}
        }).then(() => {
          enterChat();
        });
      }
    });
  });
}

function enterChat() {
  document.getElementById("room-name-display").textContent = "Lieu : " + roomName;

  const loginContainer = document.getElementById("login-container");
  const chatScreen = document.querySelector(".screen-chat");
  const chatContainer = document.getElementById("chat-container");

  loginContainer.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  chatContainer.classList.remove("hidden");

  showNotification();
  initializeUserListeners();
  setOnlineStatus();
  loadUserTheme();
  loadMessages();
}

// =========================
// Online Users
// =========================
function initializeUserListeners() {
  const usersRef = db.child("onlineUsers");

  usersRef.on("child_added", (snapshot) => {
    const user = snapshot.key;
    const status = snapshot.val().status;
    updateUserStatusUI(user, status);
  });

  usersRef.on("child_changed", (snapshot) => {
    const user = snapshot.key;
    const status = snapshot.val().status;
    updateUserStatusUI(user, status);
  });

  usersRef.on("child_removed", (snapshot) => {
    const user = snapshot.key;
    removeUserFromUI(user);
  });
}

function setOnlineStatus() {
  if (!username || !roomName) return;

  const userRef = firebase.database().ref(`rooms/${roomName}/onlineUsers/${username}`);

  firebase.database().ref(".info/connected").on("value", (snapshot) => {
    if (snapshot.val() === true) {
      userRef.set({
        status: "en ligne",
        lastSeen: new Date().toISOString()
      });
      userRef.onDisconnect().remove();

      setInterval(() => {
        userRef.update({ lastSeen: new Date().toISOString() });
      }, 5000);
    }
  });
}

function updateUserStatusUI(user, status) {
  let userElement = document.getElementById("user-status-" + user);

  if (!userElement) {
    userElement = document.createElement("li");
    userElement.id = "user-status-" + user;
    userElement.classList.add(status === "en ligne" ? "status-online" : "status-offline");

    const statusIndicator = document.createElement("span");
    statusIndicator.classList.add("status-indicator");
    userElement.appendChild(statusIndicator);

    const userNameText = document.createElement("span");
    userNameText.classList.add("user-status");
    userNameText.textContent = user + " - " + status;
    userElement.appendChild(userNameText);

    document.getElementById("online-users").appendChild(userElement);
  } else {
    userElement.classList.toggle("status-online", status === "en ligne");
    userElement.classList.toggle("status-offline", status !== "en ligne");
    userElement.querySelector(".user-status").textContent = user + " - " + status;
  }
}

function removeUserFromUI(user) {
  const userElement = document.getElementById("user-status-" + user);
  if (userElement) userElement.remove();
}

// =========================
// Thèmes bulles
// =========================
function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  Object.entries(theme).forEach(([variable, value]) => {
    document.documentElement.style.setProperty(variable, value);
  });
}

function loadUserTheme() {
  if (!username || !roomName) return;
  const userRef = firebase.database().ref(`rooms/${roomName}/onlineUsers/${username}`);
  userRef.once("value").then((snapshot) => {
    const data = snapshot.val();
    const select = document.getElementById("theme-select");
    if (data && data.theme) {
      applyTheme(data.theme);
      if (select) select.value = data.theme;
    } else {
      applyTheme("default");
      if (select) select.value = "default";
    }
  });
}

function handleThemeChange(e) {
  const selectedTheme = e.target.value;
  applyTheme(selectedTheme);

  if (!username || !roomName) return;
  const userRef = firebase.database().ref(`rooms/${roomName}/onlineUsers/${username}`);
  userRef.update({ theme: selectedTheme });
}

// =========================
// Messages
// =========================
function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const text = messageInput.value;

  if (!text.trim()) return;
  if (!db) return;

  const timestamp = Date.now();

  const msgData = {
    user: username,
    message: text,
    timestamp,
    reactions: {}
  };

  if (replyMessageId) {
    msgData.replyTo = replyMessageText || "";
    cancelReply();
  }

  const msgRef = db.child("messages").push();
  msgRef.set(msgData);

  messageInput.value = "";
}

function loadMessages() {
  if (!db) return;

  if (!messageListener) {
    messageListener = (snapshot) => {
      displayMessage(snapshot.key, snapshot.val());
    };
    db.child("messages").on("child_added", messageListener);
  }

  if (!childRemovedListenerSet) {
    db.child("messages").on("child_removed", (snapshot) => {
      const removedMessage = document.getElementById(snapshot.key);
      if (removedMessage) removedMessage.remove();
    });
    childRemovedListenerSet = true;
  }

  db.child("messages").on("child_changed", (snapshot) => {
    const key = snapshot.key;
    const data = snapshot.val();
    const msgDiv = document.getElementById(key);

    if (msgDiv && data.seen && data.user === username) {
      if (!msgDiv.querySelector(".seen-check")) {
        const seenCheck = document.createElement("span");
        seenCheck.className = "seen-check";
        seenCheck.innerHTML = `
          <svg viewBox="0 0 24 24">
            <path d="M1 13l4 4L23 3M10 14l4 4" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;
        msgDiv.appendChild(seenCheck);
      }
    }
  });
}

function displayMessage(key, data) {
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;

  const msgDiv = document.createElement("div");
  msgDiv.id = key;
  msgDiv.className = "message " + (data.user === username ? "user1" : "user2");

  // Réponse
  if (data.replyTo) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "citation flou";
    replyDiv.textContent = "Réponse du : " + data.replyTo;
    msgDiv.appendChild(replyDiv);
  }

  let content;
  if (data.type === "audio") {
    content = document.createElement("audio");
    content.controls = true;
    content.src = data.audioBase64;
    content.className = "audio-message";
  } else if (data.type === "image") {
    content = document.createElement("img");
    content.src = data.imageBase64;
    content.className = "image-message";
    content.onclick = () => openImagePopup(data.imageBase64);
  } else {
    content = document.createElement("div");
    content.className = "msg-text";

    if (data.user !== username) {
      content.classList.add("flou");
      msgDiv.addEventListener("mouseenter", () => {
        content.classList.remove("flou");
        if (!msgDiv.dataset.timerStarted) {
          msgDiv.dataset.timerStarted = "true";
          startDeletionTimer(msgDiv, key);
        }
      });
    }

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const msg = (data.message || "").replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank" style="color:#ffd700">${url}</a>`
    );
    content.innerHTML = msg;
  }

  const userTag = document.createElement("div");
  userTag.className = "username-tag";
  userTag.textContent = data.user;

  msgDiv.appendChild(userTag);
  msgDiv.appendChild(content);

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = formatTime(data.timestamp);
  msgDiv.dataset.timestamp = data.timestamp;
  msgDiv.appendChild(time);

  // Réactions
  const reactionContainer = document.createElement("div");
  reactionContainer.className = "reaction-container";
  db.child(`messages/${key}/reactions`).on("value", (snap) => {
    reactionContainer.innerHTML = "";
    if (snap.exists()) {
      const label = document.createElement("span");
      label.className = "reaction-label";
      label.textContent = "Réaction :";
      reactionContainer.appendChild(label);
      snap.forEach((child) => {
        const emoji = document.createElement("span");
        emoji.textContent = child.val();
        emoji.className = "reaction-emoji";
        reactionContainer.appendChild(emoji);
      });
    }
  });
  msgDiv.appendChild(reactionContainer);

  // Actions
  const actions = document.createElement("div");
  actions.className = "action-buttons";

  const emojiBtn = document.createElement("button");
  emojiBtn.className = "emoji-btn";
  emojiBtn.textContent = "😀";
  emojiBtn.onclick = () => toggleEmojiPickerMessage(key);
  actions.appendChild(emojiBtn);

  const emojiPicker = document.createElement("div");
  emojiPicker.className = "emoji-picker-message";
  emojiPicker.id = `emoji-picker-${key}`;
  emojis.forEach((emoji) => {
    const span = document.createElement("span");
    span.className = "emoji";
    span.textContent = emoji;
    span.onclick = () => {
      addReactionEmoji(key, emoji);
      emojiPicker.style.display = "none";
    };
    emojiPicker.appendChild(span);
  });
  msgDiv.appendChild(emojiPicker);

  const btnGroup = document.createElement("div");
  btnGroup.style.display = "flex";
  btnGroup.style.gap = "4px";

  const replyBtn = document.createElement("button");
  replyBtn.className = "icon-button";
  replyBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M10 9V5l-7 7 7 7v-4.1c4.28 0 6.88 1.45 8.95 4.1-.5-5.04-3.95-10-8.95-10z"/>
    </svg>`;
  replyBtn.onclick = () => prepareReply(key, data.message);
  btnGroup.appendChild(replyBtn);

  if (data.user === username) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-button";
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z"/>
      </svg>`;
    deleteBtn.onclick = () => db.child("messages").child(key).remove();
    btnGroup.appendChild(deleteBtn);
  }

  actions.appendChild(btnGroup);
  msgDiv.appendChild(actions);

  updateSeenStatus(msgDiv, data, key);

  messagesDiv.appendChild(msgDiv);
  scrollToBottom();

  if (data.user !== username && document.visibilityState === "hidden") {
    document.title = "💬 Nouveau message !";
    notificationSound.play().catch(() => {});
  }
}

// Effacement auto après flou
function startDeletionTimer(msgDiv, key) {
  msgDiv.classList.add("deletion-pending");
  setTimeout(() => {
    deleteMessage(msgDiv, key);
  }, 600000); // 10 min
}

function deleteMessage(msgDiv, key) {
  if (msgDiv.classList.contains("deleting")) return;
  msgDiv.classList.add("deleting");
  msgDiv.classList.add("fondu");
  setTimeout(() => {
    msgDiv.remove();
    db.child("messages").child(key).remove();
  }, 1000);
}

// Réponse
function prepareReply(key, message) {
  replyMessageId = key;
  replyMessageText = message;
  document.getElementById("reply-message").textContent = "Réponse du : " + message;
  document.getElementById("reply-container").style.display = "block";
}

function cancelReply() {
  replyMessageId = null;
  replyMessageText = "";
  document.getElementById("reply-message").textContent = "";
  document.getElementById("reply-container").style.display = "none";
}

// Réactions
function addReactionEmoji(messageId, emoji) {
  if (!db) return;
  db.child(`messages/${messageId}/reactions/${username}`).set(emoji);
}

function toggleEmojiPickerMessage(key) {
  document.querySelectorAll(".emoji-picker-message").forEach((picker) => {
    if (picker.id !== `emoji-picker-${key}`) picker.style.display = "none";
  });

  const picker = document.getElementById(`emoji-picker-${key}`);
  if (!picker) return;
  picker.style.display = picker.style.display === "flex" ? "none" : "flex";
}

// Scroll
function scrollToBottom() {
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Timestamps
function updateAllTimestamps() {
  document.querySelectorAll(".message").forEach((msg) => {
    const ts = msg.dataset.timestamp;
    if (!ts) return;
    const stamp = msg.querySelector(".timestamp");
    if (stamp) stamp.textContent = formatTime(Number(ts));
  });
}

function formatTime(ts) {
  const date = new Date(Number(ts));
  if (isNaN(date.getTime())) return "🕓";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// =========================
// Emoji global
// =========================
function loadEmojis() {
  const picker = document.getElementById("emoji-picker");
  if (!picker) return;
  picker.innerHTML = "";
  emojis.forEach((emoji) => {
    const span = document.createElement("span");
    span.className = "emoji";
    span.textContent = emoji;
    span.onclick = () => {
      insertEmoji(emoji);
    };
    picker.appendChild(span);
  });
}

function insertEmoji(emoji) {
  const messageInput = document.getElementById("message-input");
  if (!messageInput) return;
  messageInput.value += emoji;
  const picker = document.getElementById("emoji-picker");
  if (picker) picker.style.display = "none";
}

function toggleEmojiPicker() {
  const button = document.querySelector("button[onclick='toggleEmojiPicker()']");
  const picker = document.getElementById("emoji-picker");
  if (!button || !picker) return;

  if (picker.style.display !== "flex") {
    picker.style.display = "flex";
    picker.style.visibility = "hidden";

    requestAnimationFrame(() => {
      const rect = button.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      picker.style.top = `${rect.top + scrollY - picker.offsetHeight - 10}px`;
      picker.style.left = `${rect.left + scrollX}px`;
      picker.style.visibility = "visible";
    });
  } else {
    picker.style.display = "none";
  }
}

// Fermer emoji picker si clic en dehors
document.addEventListener("click", (e) => {
  const picker = document.getElementById("emoji-picker");
  const emojiButton = document.querySelector("button[onclick='toggleEmojiPicker()']");
  if (!picker || !emojiButton) return;

  if (!picker.contains(e.target) && e.target !== emojiButton && !e.target.classList.contains("emoji")) {
    picker.style.display = "none";
  }
});

// =========================
// Quitter la room
// =========================
function quitRoom() {
  if (roomName && username) {
    firebase.database().ref(`rooms/${roomName}/onlineUsers/${username}`).remove();
  }

  if (messageListener && db) {
    db.child("messages").off("child_added", messageListener);
    messageListener = null;
  }

  const chatScreen = document.querySelector(".screen-chat");
  const chatContainer = document.getElementById("chat-container");
  const loginContainer = document.getElementById("login-container");

  chatScreen.classList.add("hidden");
  chatContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");

  location.reload();
}

// =========================
// Audio
// =========================
let mediaRecorder;
let audioChunks = [];
let recordedBlob;
let microAccessGranted = false;

function toggleRecording() {
  const recordBtn = document.getElementById("record-btn");
  if (!recordBtn) return;

  if (!microAccessGranted && !mediaRecorder) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      microAccessGranted = true;
      startRecording(stream, recordBtn);
    }).catch((error) => {
      console.error("Erreur micro :", error);
      alert("Erreur : accès au micro refusé !");
    });
  } else if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  } else {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      startRecording(stream, recordBtn);
    }).catch((error) => {
      console.error("Erreur lors de la reprise :", error);
      alert("Impossible de relancer l’enregistrement.");
    });
  }
}

function startRecording(stream, recordBtn) {
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
    const audioURL = URL.createObjectURL(recordedBlob);

    document.getElementById("audio-player").src = audioURL;
    document.getElementById("audio-preview").style.display = "block";

    recordBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm6-3a6 6 0 01-12 0H4a8 8 0 0016 0h-2zm-6 8c2.21 0 4-1.79 4-4h-2a2 2 0 01-4 0H8c0 2.21 1.79 4 4 4z"/>
      </svg>`;
    recordBtn.classList.remove("recording");
    mediaRecorder = null;
  };

  mediaRecorder.start();
  recordBtn.textContent = "⏹️";
  recordBtn.classList.add("recording");

  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      alert("Durée maximale atteinte (30s)");
    }
  }, 30000);
}

function uploadAudio() {
  if (!recordedBlob) {
    alert("Aucun enregistrement à envoyer.");
    return;
  }
  if (!db) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    const base64Audio = reader.result;
    if (base64Audio.length > 400000) {
      alert("Message trop long ou lourd. Réenregistre un message plus court.");
      return;
    }

    const audioMessage = {
      user: username,
      type: "audio",
      audioBase64: base64Audio,
      timestamp: Date.now()
    };

    db.child("messages").push(audioMessage);
    document.getElementById("audio-preview").style.display = "none";
    document.getElementById("audio-player").src = "";
    recordedBlob = null;
  };

  reader.readAsDataURL(recordedBlob);
}

function cancelAudio() {
  recordedBlob = null;
  document.getElementById("audio-preview").style.display = "none";
  document.getElementById("audio-player").src = "";
}

// =========================
// Images
// =========================
function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0 || !db) return;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result;
      const imageMessage = {
        user: username,
        type: "image",
        imageBase64: base64Image,
        timestamp: Date.now()
      };
      db.child("messages").push(imageMessage);
    };
    reader.readAsDataURL(file);
  });

  event.target.value = "";
}

function initImagePopup() {
  const popup = document.getElementById("image-popup");
  const popupImg = document.getElementById("popup-img");
  const closeBtn = document.getElementById("close-popup-btn");

  if (!popup || !popupImg || !closeBtn) return;

  closeBtn.addEventListener("click", () => {
    popup.style.display = "none";
  });

  popup.addEventListener("click", (e) => {
    if (!popupImg.contains(e.target) && !closeBtn.contains(e.target)) {
      popup.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      popup.style.display = "none";
    }
  });
}

function openImagePopup(src) {
  const popup = document.getElementById("image-popup");
  const img = document.getElementById("popup-img");
  if (!popup || !img) return;
  img.src = src;
  popup.style.display = "flex";
}

// =========================
// Stealth & Panic
// =========================
function panicWipe() {
  if (!roomName) {
    window.location.href = "https://www.google.com";
    return;
  }
  firebase.database().ref(`rooms/${roomName}`).remove().catch(() => {});
  window.location.href = "https://www.google.com";
}

function activateStealth() {
  document.querySelectorAll("body > *:not(#stealth-screen)").forEach((el) => {
    if (el.id !== "stealth-screen") el.style.display = "none";
  });
  const stealth = document.getElementById("stealth-screen");
  stealth.style.display = "flex";

  const input = document.getElementById("stealth-code");
  input.value = "";
  input.focus();

  input.addEventListener("keydown", function handler(e) {
    if (e.key === "Enter") {
      if (input.value === passwordValue) {
        stealth.style.display = "none";
        document.querySelectorAll("body > *:not(#stealth-screen)").forEach((el) => {
          if (el.id !== "stealth-screen") el.style.display = "";
        });
      } else {
        input.value = "";
        input.placeholder = "Erreur. Réessaye.";
      }
      input.removeEventListener("keydown", handler);
    }
  });
}

function quitStealthSafely() {
  window.location.href = "https://www.google.com";
}

// =========================
// Vu / Seen
// =========================
function updateSeenStatus(msgDiv, data, key) {
  if (!db) return;

  if (data.user !== username) {
    msgDiv.addEventListener("mouseenter", () => {
      if (!data.seen) {
        db.child("messages").child(key).update({ seen: true });
      }
    });
  } else if (data.user === username && data.seen) {
    if (!msgDiv.querySelector(".seen-check")) {
      const seenCheck = document.createElement("span");
      seenCheck.className = "seen-check";
      seenCheck.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M1 13l4 4L23 3M10 14l4 4" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      msgDiv.appendChild(seenCheck);
    }
  }
}
