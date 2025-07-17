// Chat functionality for Logistics Route Optimizer

// Global variables
let socket;
let currentDeliveryId = null;
let typingTimeout = null;

// Initialize the chat system
function initializeChat(userId, userType) {
  // In a real implementation, this would connect to the server's Socket.io instance
  // socket = io('http://localhost:3000', {
  //   auth: {
  //     userId: userId,
  //     userType: userType // 'driver', 'customer', or 'admin'
  // });
  
  // For demo purposes, we'll simulate socket events
  console.log('Chat system initialized for user:', userId, 'type:', userType);
  
  // Set up event listeners for the simulated socket
  setupSocketEventListeners();
}

// Set up event listeners for socket events
function setupSocketEventListeners() {
  // In a real implementation, these would be actual socket.on() handlers
  // socket.on('message-received', handleMessageReceived);
  // socket.on('messages-read', handleMessagesRead);
  // socket.on('user-typing', handleUserTyping);
  // socket.on('user-online', handleUserOnline);
  // socket.on('user-offline', handleUserOffline);
  
  // Set up UI event listeners
  document.getElementById('messageInput').addEventListener('input', handleTypingEvent);
}

// Join a delivery chat room
function joinDeliveryChat(deliveryId) {
  // Leave previous chat room if any
  if (currentDeliveryId) {
    leaveDeliveryChat(currentDeliveryId);
  }
  
  currentDeliveryId = deliveryId;
  
  // In a real implementation, this would emit a socket event
  // socket.emit('join-delivery-chat', { deliveryId });
  
  console.log('Joined delivery chat room:', deliveryId);
  
  // Load chat history
  loadChatHistory(deliveryId);
}

// Leave a delivery chat room
function leaveDeliveryChat(deliveryId) {
  // In a real implementation, this would emit a socket event
  // socket.emit('leave-delivery-chat', { deliveryId });

  console.log('Left delivery chat room:', deliveryId);
  currentDeliveryId = null;
}

// Load chat history for a delivery
function loadChatHistory(deliveryId) {
  // In a real implementation, this would fetch chat history from the server
  // fetch(`/api/chat/delivery/${deliveryId}/messages`)
  //   .then(response => response.json())
  //   .then(messages => displayChatHistory(messages));
  
  // For demo purposes, we'll use the mock chat messages loaded in app.js
  console.log('Loading chat history for delivery:', deliveryId);
}

// Display chat history
function displayChatHistory(messages) {
  const chatContainer = document.getElementById('chatMessages');
  chatContainer.innerHTML = '';
  
  messages.forEach(message => {
    appendMessageToChat(message);
  });
  
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send a chat message
function sendChatMessage(text) {
  if (!currentDeliveryId || !text.trim()) return;
  
  const message = {
    deliveryId: currentDeliveryId,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };
  
  // In a real implementation, this would emit a socket event
  // socket.emit('send-message', message);
  
  // For demo purposes, we'll just append the message locally
  appendMessageToChat({
    ...message,
    sender: {
      id: 'current-user', // This would be the actual user ID in a real implementation
      name: 'You'
    },
    isOutgoing: true
  });
  
  console.log('Sent message:', message);
  
  return message;
}

// Handle a received message
function handleMessageReceived(message) {
  // Only process messages for the current delivery chat
  if (message.deliveryId !== currentDeliveryId) return;
  
  // Append the message to the chat
  appendMessageToChat({
    ...message,
    isOutgoing: false
  });
  
  // Play notification sound
  playNotificationSound();
  
  // Mark as read if the chat is open
  markMessagesAsRead(currentDeliveryId);
}

// Append a message to the chat container
function appendMessageToChat(message) {
  const chatContainer = document.getElementById('chatMessages');
  
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${message.isOutgoing ? 'outgoing' : 'incoming'}`;
  messageElement.dataset.messageId = message.id;
  
  // Format the message content
  messageElement.innerHTML = `
    ${!message.isOutgoing ? `<span class="sender">${message.sender.name}</span>` : ''}
    ${message.text}
    <span class="time">${formatChatTimestamp(message.timestamp)}</span>
  `;
  
  chatContainer.appendChild(messageElement);
  
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Mark messages as read
function markMessagesAsRead(deliveryId) {
  // In a real implementation, this would emit a socket event
  // socket.emit('mark-messages-read', { deliveryId });
  
  console.log('Marked messages as read for delivery:', deliveryId);
}

// Handle typing event
function handleTypingEvent() {
  if (!currentDeliveryId) return;
  
  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Emit typing event
  // socket.emit('typing', { deliveryId: currentDeliveryId });
  
  // Set timeout to stop typing indicator after 2 seconds
  typingTimeout = setTimeout(() => {
    // socket.emit('typing-stopped', { deliveryId: currentDeliveryId });
  }, 2000);
}

// Handle user typing indicator
function handleUserTyping(data) {
  if (data.deliveryId !== currentDeliveryId) return;
  
  // Show typing indicator
  showTypingIndicator(data.user);
}

// Show typing indicator
function showTypingIndicator(user) {
  const chatContainer = document.getElementById('chatMessages');
  
  // Remove any existing typing indicators
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  // Create typing indicator element
  const indicatorElement = document.createElement('div');
  indicatorElement.className = 'typing-indicator';
  indicatorElement.innerHTML = `<small>${user.name} is typing...</small>`;
  
  chatContainer.appendChild(indicatorElement);
  
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
}

// Handle user online status
function handleUserOnline(data) {
  console.log('User online:', data.user);
  // Update UI to show user is online
}

// Handle user offline status
function handleUserOffline(data) {
  console.log('User offline:', data.user);
  // Update UI to show user is offline
}

// Play notification sound
function playNotificationSound() {
  // In a real implementation, this would play a sound
  // const audio = new Audio('/sounds/notification.mp3');
  // audio.play();
  
  console.log('Playing notification sound');
}

// Format a timestamp for chat display
function formatChatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
