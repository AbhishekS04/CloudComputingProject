import os

SERVER_ID = os.getenv("SERVER_ID", "server-1")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5001"))

