import { io } from 'socket.io-client'

const WEBSOCKET_URL = 'http://localhost:8007'

const socket = io(WEBSOCKET_URL, {
  autoConnect: false,
})

export default socket
