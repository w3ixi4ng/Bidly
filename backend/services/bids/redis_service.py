from time import time
import redis
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

PLACE_BID_SCRIPT = """
local auction_key = KEYS[1]
local bidder_id = ARGV[1]
local bid_amount = tonumber(ARGV[2])
local timestamp = tonumber(ARGV[3])

local end_time = tonumber(redis.call("HGET", auction_key, "auction_end_time"))
local current_bid = tonumber(redis.call("HGET", auction_key, "current_bid"))

if not end_time then return {err="Auction not found"} end
if timestamp > end_time then return {err="Auction has ended"} end
if current_bid and bid_amount >= current_bid then return {err="Bid must be lower than current bid"} end

redis.call("HSET", auction_key, "bidder_id", bidder_id)
redis.call("HSET", auction_key, "current_bid", bid_amount)
return {ok="Bid placed successfully"}
"""


class RedisService:
    def __init__(self):
        # using Redis from Upstash which is a serverless Redis provider that allows us to use Redis without having to manage our own Redis server
        # decode_responses=True makes it so that the responses from Redis are returned as strings instead of bytes which is more convenient to work with in Python
        self.redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
        self.place_bid_script = self.redis_client.register_script(PLACE_BID_SCRIPT)

    def create_auction(self, task_id: str, auction_end_time: str, starting_bid: float):
        auction_key = f"auction:{task_id}"
        self.redis_client.hset(auction_key, mapping={"auction_end_time": auction_end_time, "current_bid": starting_bid, "bidder_id": ""})
        ttl = int(float(auction_end_time) - time()) + 3600
        if ttl > 0:
            self.redis_client.expire(auction_key, ttl)
        # we set the ttl to be the time until the auction ends plus an extra hour just to be safe in case there are any issues with the auction ending exactly at the end time, 
        # this way we ensure that the auction data will still be available for a short period after the auction ends for any final processing or retrieval of the winning bid information.

    def place_bid(self, task_id: str, bidder_id: str, bid_amount: float, timestamp: str):
        auction_key = f"auction:{task_id}"
        return self.place_bid_script(keys=[auction_key], args=[bidder_id, bid_amount, timestamp])
    

    def get_current_bid(self, task_id: str):
        auction_key = f"auction:{task_id}"
        bid_amount = self.redis_client.hget(auction_key, "current_bid")
        bidder_id = self.redis_client.hget(auction_key, "bidder_id")
        return {"bid_amount": float(bid_amount) if bid_amount else None, "bidder_id": bidder_id if bidder_id else None}
    




