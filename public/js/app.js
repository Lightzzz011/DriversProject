// Main application functionality for Logistics Route Optimizer

// Global state
let currentUser = null;
let orders = [];
let drivers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Load mock data for demonstration
  loadMockData();
  
  // Populate tables with mock data
  populateOrdersTable();
  populateDriversTable();
  
  // Set up event listeners
  setupEventListeners();
});

// Set up event listeners for the application
function setupEventListeners() {
  // Event delegation for order actions
  document.getElementById('ordersTable').addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-assign')) {
      const orderId = e.target.dataset.orderId;
      assignOrderToDriver(orderId);
    } else if (e.target.classList.contains('btn-chat')) {
      const orderId = e.target.dataset.orderId;
      openChatModal(orderId);
    }
  });
  
  // Event delegation for driver actions
  document.getElementById('driversTable').addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-view-orders')) {
      const driverId = e.target.dataset.driverId;
      viewDriverOrders(driverId);
    } else if (e.target.classList.contains('btn-toggle-status')) {
      const driverId = e.target.dataset.driverId;
      toggleDriverStatus(driverId);
    }
  });
  
  // Send message button in chat modal
  document.getElementById('sendMessageBtn').addEventListener('click', function() {
    sendChatMessage();
  });
  
  // Enter key in message input
  document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
}

// Load mock data for demonstration
function loadMockData() {
  // Mock orders data
  orders = [
    {
      id: 'ORD-001',
      customer: 'John Smith',
      address: '123 Main St, Bangalore',
      status: 'pending',
      items: [
        { name: 'Smartphone', quantity: 1 },
        { name: 'Phone Case', quantity: 1 }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
      id: 'ORD-002',
      customer: 'Alice Johnson',
      address: '456 Park Ave, Bangalore',
      status: 'in-progress',
      items: [
        { name: 'Laptop', quantity: 1 },
        { name: 'Mouse', quantity: 1 },
        { name: 'Keyboard', quantity: 1 }
      ],
      driverId: 'DRV-001',
      createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    },
    {
      id: 'ORD-003',
      customer: 'Bob Williams',
      address: '789 Oak St, Bangalore',
      status: 'delivered',
      items: [
        { name: 'Headphones', quantity: 1 }
      ],
      driverId: 'DRV-002',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      deliveredAt: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
    },
    {
      id: 'ORD-004',
      customer: 'Emma Davis',
      address: '101 Pine St, Bangalore',
      status: 'pending',
      items: [
        { name: 'Tablet', quantity: 1 },
        { name: 'Charger', quantity: 1 }
      ],
      createdAt: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
    },
    {
      id: 'ORD-005',
      customer: 'Michael Wilson',
      address: '202 Maple St, Bangalore',
      status: 'in-progress',
      items: [
        { name: 'Smart Watch', quantity: 1 }
      ],
      driverId: 'DRV-003',
      createdAt: new Date(Date.now() - 5400000).toISOString() // 1.5 hours ago
    }
  ];
  
  // Mock drivers data
  drivers = [
    {
      id: 'DRV-001',
      name: 'David Brown',
      status: 'active',
      location: { lat: 12.9716, lng: 77.5946 },
      rating: 4.8,
      totalDeliveries: 128,
      phone: '+91 9876543210'
    },
    {
      id: 'DRV-002',
      name: 'Sarah Miller',
      status: 'inactive',
      location: { lat: 12.9352, lng: 77.6245 },
      rating: 4.5,
      totalDeliveries: 95,
      phone: '+91 9876543211'
    },
    {
      id: 'DRV-003',
      name: 'James Wilson',
      status: 'active',
      location: { lat: 12.9542, lng: 77.4905 },
      rating: 4.9,
      totalDeliveries: 210,
      phone: '+91 9876543212'
    }
  ];
  
  // Set current user (for chat demonstration)
  currentUser = {
    id: 'ADMIN-001',
    name: 'Dispatch Admin',
    role: 'admin'
  };
}

// Populate the orders table with data
function populateOrdersTable() {
  const tableBody = document.getElementById('ordersTable');
  
  if (orders.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No orders available</td></tr>';
    return;
  }
  
  let html = '';
  
  orders.forEach(order => {
    const statusBadgeClass = getStatusBadgeClass(order.status);
    
    html += `
      <tr>
        <td>${order.id}</td>
        <td>${order.customer}</td>
        <td>${order.address}</td>
        <td><span class="badge ${statusBadgeClass}">${formatStatus(order.status)}</span></td>
        <td>
          ${order.status === 'pending' ? 
            `<button class="btn btn-sm btn-primary btn-assign" data-order-id="${order.id}">Assign</button>` : 
            ''}
          <button class="btn btn-sm btn-info btn-chat" data-order-id="${order.id}">Chat</button>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Populate the drivers table with data
function populateDriversTable() {
  const tableBody = document.getElementById('driversTable');
  
  if (drivers.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No drivers available</td></tr>';
    return;
  }
  
  let html = '';
  
  drivers.forEach(driver => {
    const statusClass = driver.status === 'active' ? 'bg-success' : 'bg-secondary';
    const statusText = driver.status === 'active' ? 'Active' : 'Inactive';
    const buttonClass = driver.status === 'active' ? 'btn-danger' : 'btn-success';
    const buttonText = driver.status === 'active' ? 'Deactivate' : 'Activate';
    
    html += `
      <tr>
        <td>${driver.id}</td>
        <td>${driver.name}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>Lat: ${driver.location.lat.toFixed(4)}, Lng: ${driver.location.lng.toFixed(4)}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-view-orders" data-driver-id="${driver.id}">View Orders</button>
          <button class="btn btn-sm ${buttonClass} btn-toggle-status" data-driver-id="${driver.id}">${buttonText}</button>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Get the appropriate badge class for an order status
function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'bg-warning text-dark';
    case 'in-progress':
      return 'bg-info text-dark';
    case 'delivered':
      return 'bg-success';
    case 'cancelled':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

// Format status text for display
function formatStatus(status) {
  return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Assign an order to a driver
function assignOrderToDriver(orderId) {
  // Get available drivers
  const availableDrivers = drivers.filter(driver => driver.status === 'active');
  
  if (availableDrivers.length === 0) {
    alert('No active drivers available for assignment.');
    return;
  }
  
  // For demo purposes, just assign to the first available driver
  const driver = availableDrivers[0];
  
  // Update the order in our mock data
  const orderIndex = orders.findIndex(order => order.id === orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].status = 'in-progress';
    orders[orderIndex].driverId = driver.id;
    
    // In a real app, this would be an API call
    // fetch(`/api/delivery/orders/${orderId}/assign`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ driverId: driver.id })
    // });
    
    // Refresh the orders table
    populateOrdersTable();
    
    alert(`Order ${orderId} assigned to driver ${driver.name} (${driver.id}).`);
  }
}

// View orders assigned to a driver
function viewDriverOrders(driverId) {
  // Filter orders for this driver
  const driverOrders = orders.filter(order => order.driverId === driverId);
  
  if (driverOrders.length === 0) {
    alert(`No orders assigned to driver ${driverId}.`);
    return;
  }
  
  // Format orders for display
  const ordersList = driverOrders.map(order => 
    `${order.id}: ${order.customer} - ${formatStatus(order.status)}`
  ).join('\n');
  
  alert(`Orders assigned to driver ${driverId}:\n\n${ordersList}`);
}

// Toggle a driver's status (active/inactive)
function toggleDriverStatus(driverId) {
  const driverIndex = drivers.findIndex(driver => driver.id === driverId);
  
  if (driverIndex !== -1) {
    // Toggle status
    drivers[driverIndex].status = drivers[driverIndex].status === 'active' ? 'inactive' : 'active';
    
    // In a real app, this would be an API call
    // fetch(`/api/driver/${driverId}/availability`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ status: drivers[driverIndex].status })
    // });
    
    // Refresh the drivers table
    populateDriversTable();
  }
}

// Open the chat modal for an order
function openChatModal(orderId) {
  const order = orders.find(order => order.id === orderId);
  
  if (!order) return;
  
  // Set the modal title
  document.querySelector('#chatModal .modal-title').textContent = `Chat - Order ${orderId} - ${order.customer}`;
  
  // Clear previous messages
  document.getElementById('chatMessages').innerHTML = '';
  
  // Load mock chat messages
  loadMockChatMessages(orderId);
  
  // Show the modal
  const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
  chatModal.show();
  
  // Focus the message input
  document.getElementById('messageInput').focus();
  
  // Store the current order ID for sending messages
  document.getElementById('messageInput').dataset.orderId = orderId;
}

// Load mock chat messages for demonstration
function loadMockChatMessages(orderId) {
  const chatContainer = document.getElementById('chatMessages');
  const order = orders.find(order => order.id === orderId);
  
  if (!order) return;
  
  // Generate some mock messages based on order status
  const messages = [];
  
  // Add messages based on order status
  if (order.status === 'pending') {
    messages.push({
      sender: { id: 'SYSTEM', name: 'System' },
      text: `Order ${orderId} has been created and is pending assignment.`,
      timestamp: new Date(new Date(order.createdAt).getTime() + 60000).toISOString()
    });
  } else if (order.status === 'in-progress') {
    const driver = drivers.find(driver => driver.id === order.driverId);
    
    messages.push({
      sender: { id: 'SYSTEM', name: 'System' },
      text: `Order ${orderId} has been assigned to ${driver ? driver.name : 'a driver'}.`,
      timestamp: new Date(new Date(order.createdAt).getTime() + 600000).toISOString()
    });
    
    messages.push({
      sender: { id: order.driverId, name: driver ? driver.name : 'Driver' },
      text: `Hello ${order.customer}, I'm on my way with your order. ETA is about 30 minutes.`,
      timestamp: new Date(new Date(order.createdAt).getTime() + 900000).toISOString()
    });
    
    messages.push({
      sender: { id: `CUST-${orderId}`, name: order.customer },
      text: 'Thank you! Please call me when you\'re nearby.',
      timestamp: new Date(new Date(order.createdAt).getTime() + 1200000).toISOString()
    });
  } else if (order.status === 'delivered') {
    const driver = drivers.find(driver => driver.id === order.driverId);
    
    messages.push({
      sender: { id: order.driverId, name: driver ? driver.name : 'Driver' },
      text: `Hello ${order.customer}, I've arrived with your order.`,
      timestamp: new Date(new Date(order.deliveredAt).getTime() - 900000).toISOString()
    });
    
    messages.push({
      sender: { id: `CUST-${orderId}`, name: order.customer },
      text: 'Great! I\'ll be right down to collect it.',
      timestamp: new Date(new Date(order.deliveredAt).getTime() - 600000).toISOString()
    });
    
    messages.push({
      sender: { id: 'SYSTEM', name: 'System' },
      text: `Order ${orderId} has been delivered successfully.`,
      timestamp: order.deliveredAt
    });
    
    messages.push({
      sender: { id: `CUST-${orderId}`, name: order.customer },
      text: 'Thank you for the delivery! Everything arrived in perfect condition.',
      timestamp: new Date(new Date(order.deliveredAt).getTime() + 300000).toISOString()
    });
  }
  
  // Render the messages
  messages.forEach(message => {
    const isOutgoing = message.sender.id === currentUser.id;
    const messageClass = isOutgoing ? 'outgoing' : 'incoming';
    const systemMessage = message.sender.id === 'SYSTEM';
    
    const messageElement = document.createElement('div');
    messageElement.className = systemMessage ? 'text-center text-muted my-3' : `chat-message ${messageClass}`;
    
    if (systemMessage) {
      messageElement.innerHTML = `
        <small>${message.text}</small>
        <br>
        <small>${formatTimestamp(message.timestamp)}</small>
      `;
    } else {
      messageElement.innerHTML = `
        ${!isOutgoing ? `<span class="sender">${message.sender.name}</span>` : ''}
        ${message.text}
        <span class="time">${formatTimestamp(message.timestamp)}</span>
      `;
    }
    
    chatContainer.appendChild(messageElement);
  });
  
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send a chat message
function sendChatMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();
  const orderId = messageInput.dataset.orderId;
  
  if (!message || !orderId) return;
  
  // Clear the input
  messageInput.value = '';
  
  // Create a message element
  const chatContainer = document.getElementById('chatMessages');
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message outgoing';
  messageElement.innerHTML = `
    ${message}
    <span class="time">${formatTimestamp(new Date().toISOString())}</span>
  `;
  
  // Add the message to the chat
  chatContainer.appendChild(messageElement);
  
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // In a real app, this would send the message via WebSocket
  // socket.emit('send-message', {
  //   orderId,
  //   text: message,
  //   senderId: currentUser.id
  // });
  
  // Simulate a response after a short delay
  setTimeout(() => {
    simulateChatResponse(orderId);
  }, 1500);
}

// Simulate a chat response for demonstration
function simulateChatResponse(orderId) {
  const order = orders.find(order => order.id === orderId);
  
  if (!order) return;
  
  // Determine who should respond based on order status
  let responderId, responderName, responseText;
  
  if (order.status === 'pending') {
    // System response for pending orders
    responderId = 'SYSTEM';
    responderName = 'System';
    responseText = 'A driver will be assigned to your order soon.';
  } else {
    // Customer or driver response for other statuses
    const isCustomerResponse = Math.random() > 0.5;
    
    if (isCustomerResponse) {
      responderId = `CUST-${orderId}`;
      responderName = order.customer;
      responseText = 'Thank you for the update!';
    } else {
      const driver = drivers.find(driver => driver.id === order.driverId);
      responderId = order.driverId;
      responderName = driver ? driver.name : 'Driver';
      responseText = 'I\'ll keep you updated on the delivery progress.';
    }
  }
  
  // Create a message element
  const chatContainer = document.getElementById('chatMessages');
  
  if (responderId === 'SYSTEM') {
    const messageElement = document.createElement('div');
    messageElement.className = 'text-center text-muted my-3';
    messageElement.innerHTML = `
      <small>${responseText}</small>
      <br>
      <small>${formatTimestamp(new Date().toISOString())}</small>
    `;
    chatContainer.appendChild(messageElement);
  } else {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message incoming';
    messageElement.innerHTML = `
      <span class="sender">${responderName}</span>
      ${responseText}
      <span class="time">${formatTimestamp(new Date().toISOString())}</span>
    `;
    chatContainer.appendChild(messageElement);
  }
  
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Format a timestamp for display
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}