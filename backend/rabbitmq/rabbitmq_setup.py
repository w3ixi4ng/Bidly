#!/usr/bin/env python3

"""
A standalone script to create exchanges and queues on RabbitMQ.
"""

import pika

amqp_host = "rabbitmq"
amqp_port = 5672
amqp_user = "guest"
amqp_password = "guest"
exchange_name = "bidly"
exchange_type = "topic"

queues = [
    {"name": "Start_Auction", "routing_key": "start.auction"},
    {"name": "Process_Winner", "routing_key": "process.winner"},

    {"name": "End_Auction_Payment", "routing_key": "end.auction.payment"},
    {"name": "End_Auction_Chat", "routing_key": "end.auction.chat"},
    {"name": "End_Auction_Notifications", "routing_key": "end.auction.notifications"},
    
    {"name": "Out_Bidded_WebSocket", "routing_key": "out.bidded.websocket"},
    {"name": "Out_Bidded_Notifications", "routing_key": "out.bidded.notifications"},
]


def create_exchange(hostname, port, exchange_name, exchange_type):
    print(f"Connecting to AMQP broker {hostname}:{port}...")
    # connect to the broker
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=hostname,
            port=port,
            heartbeat=300,
            blocked_connection_timeout=300,
        )
    )
    print("Connected")

    print("Create channel")
    channel = connection.channel()

    # Set up the exchange if the exchange doesn't exist
    print(f"Create exchange: {exchange_name}")
    channel.exchange_declare(
        exchange=exchange_name, exchange_type=exchange_type, durable=True
    )
    # 'durable' makes the exchange survive broker restarts

    return connection, channel


def create_queue(channel, exchange_name, queue_name, routing_key):
    print(f"Create queue: {queue_name} and bind to exchange: {exchange_name} with routing_key: {routing_key}")
    channel.queue_declare(queue=queue_name, durable=True)
    # 'durable' makes the queue survive broker restarts

    # bind the queue to the exchange with routing_key
    channel.queue_bind(
        exchange=exchange_name, queue=queue_name, routing_key=routing_key
    )


def main():
    try:
        connection, channel = create_exchange(
            hostname=amqp_host,
            port=amqp_port,
            exchange_name=exchange_name,
            exchange_type=exchange_type,
        )

        for queue in queues:
            create_queue(
                channel=channel,
                exchange_name=exchange_name,
                queue_name=queue["name"],
                routing_key=queue["routing_key"],
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