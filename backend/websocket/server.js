const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const amqp = require('amqplib');

const PORT = process.env.PORT || 8007;
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || 5672;
const EXCHANGE_NAME = 'bidly';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.get('/', (req, res) => res.json({ status: 'ok' }));

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

  socket.on('disconnect', () => {
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
        console.log(`[bid_update] emitted to room ${room}:`, data);
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
  const q = await channel.assertQueue('Task_Created', { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, 'task.created');
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

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
  const connection = await amqp.connect(`amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`);

  const bidChannel = await connection.createChannel();
  const taskChannel = await connection.createChannel();

  await consumeBidUpdates(bidChannel);
  await consumeTaskCreated(taskChannel);

  console.log('RabbitMQ consumers started.');

  httpServer.listen(PORT, () => {
    console.log(`WebSocket service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start websocket service:', err);
  process.exit(1);
});
