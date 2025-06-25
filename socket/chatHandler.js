/**
 * WebSocket Chat Handler
 * 
 * Manages real-time communication between drivers and customers
 * using Socket.io for the chat system.
 */

const admin = require('firebase-admin');
const { getFirestore, getDatabase } = require('../services/firebase');

/**
 * Initialize Socket.io chat handler
 * @param {SocketIO.Server} io - Socket.io server instance
 */
module.exports = function(io) {
  // Chat namespace
  const chatNamespace = io.of('/chat');
  
  // Store active connections
  const activeConnections = new Map();
  
  // Middleware for authentication
  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token is required'));
      }
      
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Attach user data to socket
      socket.userId = decodedToken.uid;
      socket.userType = decodedToken.userType || 'customer'; // Default to customer
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  chatNamespace.on('connection', async (socket) => {
    console.log(`User connected to chat: ${socket.userId} (${socket.userType})`);
    
    // Store connection in active connections map
    activeConnections.set(socket.userId, socket);
    
    // Update user's online status in database
    try {
      const db = getFirestore();
      await db.collection(socket.userType === 'driver' ? 'drivers' : 'customers')
        .doc(socket.userId)
        .update({
          isOnline: true,
          lastOnline: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
    
    // Join user to their personal room
    socket.join(socket.userId);
    
    // Handle joining a chat room for a specific delivery
    socket.on('join-delivery-chat', async (deliveryId) => {
      try {
        // Verify that the user has access to this delivery
        const db = getFirestore();
        const deliveryDoc = await db.collection('deliveryOrders').doc(deliveryId).get();
        
        if (!deliveryDoc.exists) {
          socket.emit('error', { message: 'Delivery not found' });
          return;
        }
        
        const deliveryData = deliveryDoc.data();
        
        // Check if user has access to this delivery
        if (
          socket.userType === 'driver' && deliveryData.driverId === socket.userId ||
          socket.userType === 'customer' && deliveryData.customerId === socket.userId ||
          socket.userType === 'admin' // Admins have access to all deliveries
        ) {
          // Join the delivery chat room
          const roomId = `delivery-${deliveryId}`;
          socket.join(roomId);
          
          // Notify user that they've joined the room
          socket.emit('joined-delivery-chat', { deliveryId, roomId });
          
          // Load recent chat history
          const chatHistorySnapshot = await db.collection('chatMessages')
            .where('deliveryId', '==', deliveryId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
          
          const chatHistory = [];
          chatHistorySnapshot.forEach(doc => {
            chatHistory.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          // Send chat history to user
          socket.emit('chat-history', { deliveryId, messages: chatHistory.reverse() });
          
          // Notify other room participants that user has joined
          socket.to(roomId).emit('user-joined', {
            userId: socket.userId,
            userType: socket.userType,
            timestamp: new Date().toISOString()
          });
        } else {
          socket.emit('error', { message: 'You do not have access to this delivery chat' });
        }
      } catch (error) {
        console.error('Error joining delivery chat:', error);
        socket.emit('error', { message: 'Failed to join delivery chat' });
      }
    });
    
    // Handle sending a message
    socket.on('send-message', async (data) => {
      try {
        const { deliveryId, message, attachmentUrl } = data;
        
        if (!deliveryId || !message) {
          socket.emit('error', { message: 'Delivery ID and message are required' });
          return;
        }
        
        // Create message object
        const messageObj = {
          deliveryId,
          senderId: socket.userId,
          senderType: socket.userType,
          message,
          attachmentUrl: attachmentUrl || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        };
        
        // Save message to database
        const db = getFirestore();
        const messageRef = await db.collection('chatMessages').add(messageObj);
        
        // Convert Firestore timestamp for Socket.io emission
        const messageToEmit = {
          ...messageObj,
          id: messageRef.id,
          timestamp: new Date().toISOString()
        };
        
        // Emit message to the delivery chat room
        const roomId = `delivery-${deliveryId}`;
        chatNamespace.to(roomId).emit('new-message', messageToEmit);
        
        // Also update the delivery with latest message info
        await db.collection('deliveryOrders').doc(deliveryId).update({
          latestMessage: {
            text: message.substring(0, 100), // Truncate long messages
            senderId: socket.userId,
            senderType: socket.userType,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        
        // Send push notification to the other party
        const deliveryDoc = await db.collection('deliveryOrders').doc(deliveryId).get();
        const deliveryData = deliveryDoc.data();
        
        let recipientId;
        if (socket.userType === 'driver') {
          recipientId = deliveryData.customerId;
        } else if (socket.userType === 'customer') {
          recipientId = deliveryData.driverId;
        }
        
        if (recipientId) {
          // Check if recipient is online in the chat
          const isRecipientInRoom = io.of('/chat').adapter.rooms.get(`delivery-${deliveryId}`)?.has(recipientId);
          
          if (!isRecipientInRoom) {
            // Send push notification since recipient is not in the chat room
            const recipientDoc = await db.collection(
              socket.userType === 'driver' ? 'customers' : 'drivers'
            ).doc(recipientId).get();
            
            if (recipientDoc.exists) {
              const recipientData = recipientDoc.data();
              const fcmToken = recipientData.fcmToken;
              
              if (fcmToken) {
                const senderName = socket.userType === 'driver' ? 'Driver' : 'Customer';
                
                await admin.messaging().send({
                  notification: {
                    title: `New message from ${senderName}`,
                    body: message.substring(0, 100) // Truncate long messages
                  },
                  data: {
                    deliveryId,
                    messageId: messageRef.id,
                    type: 'chat_message'
                  },
                  token: fcmToken
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle marking messages as read
    socket.on('mark-messages-read', async (data) => {
      try {
        const { deliveryId, messageIds } = data;
        
        if (!deliveryId || !messageIds || !Array.isArray(messageIds)) {
          socket.emit('error', { message: 'Delivery ID and message IDs array are required' });
          return;
        }
        
        const db = getFirestore();
        const batch = db.batch();
        
        // Update each message
        for (const messageId of messageIds) {
          const messageRef = db.collection('chatMessages').doc(messageId);
          batch.update(messageRef, { read: true });
        }
        
        await batch.commit();
        
        // Notify the delivery chat room that messages were read
        const roomId = `delivery-${deliveryId}`;
        socket.to(roomId).emit('messages-read', {
          deliveryId,
          messageIds,
          readBy: socket.userId,
          readByType: socket.userType,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { deliveryId, isTyping } = data;
      
      if (!deliveryId) {
        socket.emit('error', { message: 'Delivery ID is required' });
        return;
      }
      
      const roomId = `delivery-${deliveryId}`;
      socket.to(roomId).emit('user-typing', {
        deliveryId,
        userId: socket.userId,
        userType: socket.userType,
        isTyping,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle leaving a chat room
    socket.on('leave-delivery-chat', (deliveryId) => {
      if (!deliveryId) {
        socket.emit('error', { message: 'Delivery ID is required' });
        return;
      }
      
      const roomId = `delivery-${deliveryId}`;
      socket.leave(roomId);
      
      // Notify other room participants that user has left
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        userType: socket.userType,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('left-delivery-chat', { deliveryId });
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected from chat: ${socket.userId} (${socket.userType})`);
      
      // Remove from active connections
      activeConnections.delete(socket.userId);
      
      // Update user's online status in database
      try {
        const db = getFirestore();
        await db.collection(socket.userType === 'driver' ? 'drivers' : 'customers')
          .doc(socket.userId)
          .update({
            isOnline: false,
            lastOnline: admin.firestore.FieldValue.serverTimestamp()
          });
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    });
  });
  
  // Return the namespace for external use
  return chatNamespace;
};