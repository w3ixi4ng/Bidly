const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const amqp = require('amqplib');

const PORT = process.env.PORT || 8007;
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT_NUM || 5672;
const EXCHANGE_NAME = 'bidly';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());
app.get('/', (req, res) => res.json({ status: 'ok' }));

app.post('/broadcast/task-updated', (req, res) => {
  const task = req.body;
  if (!task || !task.task_id) {
    return res.status(400).json({ error: 'task_id is required' });
  }
  io.emit('task_updated', task);
  console.log(`[task_updated] broadcasted globally for task_id ${task.task_id}`);
  res.json({ status: 'ok' });
});

// ---------------------------------------------------------------------------
// Presence tracking: socketId -> userId
// ---------------------------------------------------------------------------
const socketUserMap = new Map(); // socketId -> userId

// ---------------------------------------------------------------------------
// Socket.IO events
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[connect] client connected: ${socket.id}`);

  socket.on('join_auction', (data) => {
    const taskId = data?.task_id;
    if (taskId) {
      const room = `auction_${taskId}`;
      socket.join(room);
      console.log(`[join_auction] ${socket.id} joined room ${room}`);
      socket.emit('joined', { room });
    } else {
      socket.emit('error', { message: 'task_id is required' });
    }
  });

  socket.on('join_user', (data) => {
    const userId = data?.user_id;
    if (userId) {
      const room = `user_${userId}`;
      socket.join(room);
      socketUserMap.set(socket.id, userId);
      console.log(`[join_user] ${socket.id} joined room ${room}`);
      socket.emit('joined', { room });
      // Send currently online users to the newly connected client
      const onlineUserIds = [...new Set(socketUserMap.values())];
      onlineUserIds.forEach((uid) => {
        socket.emit('user_online', { user_id: uid });
      });
      // Broadcast this user's presence to all connected clients
      io.emit('user_online', { user_id: userId });
    } else {
      socket.emit('error', { message: 'user_id is required' });
    }
  });

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    socketUserMap.delete(socket.id);
    if (userId) {
      // Only mark offline if no other sockets for same user remain
      const stillOnline = [...socketUserMap.values()].includes(userId);
      if (!stillOnline) {
        io.emit('user_offline', { user_id: userId });
        console.log(`[presence] user_offline: ${userId}`);
      }
    }
    console.log(`[disconnect] client disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// RabbitMQ consumers
// ---------------------------------------------------------------------------
async function consumeBidUpdates(channel) {
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  const q = await channel.assertQueue('Out_Bidded_WebSocket', { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, 'out.bidded.websocket');
  channel.prefetch(10);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      const { task_id } = data;
      if (task_id) {
        const room = `auction_${task_id}`;
        io.to(room).emit('bid_update', data);
        // Also broadcast globally so the marketplace page can update
        io.emit('bid_update', data);
        console.log(`[bid_update] emitted to room ${room} + globally:`, data);
      } else {
        console.log('[bid_update] missing task_id in message:', data);
      }
      channel.ack(msg);
    } catch (e) {
      console.error('[bid_update] error processing message:', e);
      channel.nack(msg, false, false);
    }
  });
}

async function consumeTaskCreated(channel) {
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  const q = await channel.assertQueue('Task_Created_WebSocket', { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, 'task.created.websocket');
  channel.prefetch(10);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      io.emit('task_created', data);
      console.log('[task_created] broadcasted globally:', data);
      channel.ack(msg);
    } catch (e) {
      console.error('[task_created] error processing message:', e);
      channel.nack(msg, false, false);
    }
  });
}

async function consumeNewMessages(channel) {
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  const q = await channel.assertQueue('New_Message_WebSocket', { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, 'new.message.websocket');
  channel.prefetch(10);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      const { recipient_id, sender_id, notify_sender } = data;
      if (recipient_id) {
        if (notify_sender && sender_id) {
          io.to(`user_${sender_id}`).to(`user_${recipient_id}`).emit('new_message', data);
          console.log(`[new_message] emitted to user_${sender_id} and user_${recipient_id}:`, data);
        } else {
          io.to(`user_${recipient_id}`).emit('new_message', data);
          console.log(`[new_message] emitted to user_${recipient_id}:`, data);
        }
      } else {
        console.log('[new_message] missing recipient_id in message:', data);
      }
      channel.ack(msg);
    } catch (e) {
      console.error('[new_message] error processing message:', e);
      channel.nack(msg, false, false);
    }
  });
}

async function consumeTaskStarted(channel) {
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  const q = await channel.assertQueue('Task_Started_WebSocket', { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, 'task.started.websocket');
  channel.prefetch(10);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      const { task_id } = data;
      if (task_id) {
        io.emit('task_started', { task_id });
        console.log(`[task_started] broadcasted globally for task_id ${task_id}`);
      }
      channel.ack(msg);
    } catch (e) {
      console.error('[task_started] error processing message:', e);
      channel.nack(msg, false, false);
    }
  });
}

async function consumeAuctionEnded(channel) {
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  const q = await channel.assertQueue('End_Auction_WebSocket', { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, 'process.winner');
  channel.prefetch(10);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      const { task_id } = data;
      if (task_id) {
        io.emit('auction_ended', { task_id });
        console.log(`[auction_ended] broadcasted globally for task_id ${task_id}`);
      } else {
        console.log('[auction_ended] missing task_id in message:', data);
      }
      channel.ack(msg);
    } catch (e) {
      console.error('[auction_ended] error processing message:', e);
      channel.nack(msg, false, false);
    }
  });
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
  const connection = await amqp.connect(`amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`);

  const bidChannel = await connection.createChannel();
  const taskChannel = await connection.createChannel();
  const taskStartedChannel = await connection.createChannel();
  const chatChannel = await connection.createChannel();
  const auctionChannel = await connection.createChannel();

  await consumeBidUpdates(bidChannel);
  await consumeTaskCreated(taskChannel);
  await consumeTaskStarted(taskStartedChannel);
  await consumeNewMessages(chatChannel);
  await consumeAuctionEnded(auctionChannel);

  console.log('RabbitMQ consumers started.');

  httpServer.listen(PORT, () => {
    console.log(`WebSocket service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start websocket service:', err);
  process.exit(1);
});
