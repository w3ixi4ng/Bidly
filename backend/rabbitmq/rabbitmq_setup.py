#!/usr/bin/env python3

"""
A standalone script to create exchanges and queues on RabbitMQ.
"""

import pika

amqp_host = "rabbitmq"
amqp_port = 5672

exchanges = [
    {"name": "bidly", "type": "topic", "arguments": {}},
]

# queues bound to "bidly" topic exchange
bidly_queues = [
    {"name": "Start_Auction", "routing_key": "start.auction"},
    {"name": "Create_Task", "routing_key": "create.task"},

    {"name": "Process_Winner", "routing_key": "process.winner"},
    {"name": "End_Auction_WebSocket", "routing_key": "process.winner"},

    {"name": "End_Auction_Chat", "routing_key": "end.auction.chat"},
    {"name": "End_Auction_Notifications", "routing_key": "end.auction.notifications"},
    
    {"name": "Out_Bidded_WebSocket", "routing_key": "out.bidded.websocket"},
    {"name": "Out_Bidded_Notifications", "routing_key": "out.bidded.notifications"},

    {"name": "Task_Created_WebSocket", "routing_key": "task.created.websocket"},
    {"name": "New_Message_WebSocket", "routing_key": "new.message.websocket"}, # joshua added: for chat-log
]


def connect(hostname, port):
    print(f"Connecting to AMQP broker {hostname}:{port}...")
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=hostname,
            port=port,
            heartbeat=300,
            blocked_connection_timeout=300,
        )
    )
    print("Connected")
    channel = connection.channel()
    return connection, channel


def create_exchange(channel, exchange_name, exchange_type, arguments={}):
    print(f"Create exchange: {exchange_name}")
    channel.exchange_declare(
        exchange=exchange_name, exchange_type=exchange_type, durable=True, arguments=arguments
    )
    # 'durable' makes the exchange survive broker restarts


def create_queue(channel, exchange_name, queue_name, routing_key):
    print(f"Create queue: {queue_name} and bind to exchange: {exchange_name} with routing_key: {routing_key}")
    channel.queue_declare(queue=queue_name, durable=True)
    # 'durable' makes the queue survive broker restarts

    # bind the queue to the exchange with routing_key
    channel.queue_bind(
        exchange=exchange_name, queue=queue_name, routing_key=routing_key
    )


def main():
    connection = None
    try:
        connection, channel = connect(hostname=amqp_host, port=amqp_port)

        for exchange in exchanges:
            create_exchange(channel, exchange["name"], exchange["type"], exchange["arguments"])

        for queue in bidly_queues:
            create_queue(channel, "bidly", queue["name"], queue["routing_key"])

        # waiting queue for delayed auction end messages — no consumers, messages expire and
        # are dead-lettered to "bidly" exchange with routing key "process.winner"
        print("Create queue: auction_in_progress (DLX → bidly/process.winner)")
        channel.queue_declare(
            queue="auction_in_progress",
            durable=True,
            arguments={
                "x-dead-letter-exchange": "bidly",
                "x-dead-letter-routing-key": "process.winner",
            }
        )

        # waiting queue for delayed auction start messages — no consumers, messages expire and
        # are dead-lettered to "bidly" exchange with routing key "start.auction
        print("Create queue: auction_pending (DLX → bidly/start.auction)")
        channel.queue_declare(
            queue="auction_pending",
            durable=True,
            arguments={
                "x-dead-letter-exchange": "bidly",
                "x-dead-letter-routing-key": "start.auction",
            }
        )

        print("Setup complete")
    except pika.exceptions.AMQPConnectionError as e:
        print(f"Failed to connect to AMQP broker: {e}")
        raise
    finally:
        if connection:
            print("Closing connection")
            connection.close()

if __name__ == "__main__":
    main()
