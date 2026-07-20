import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: false, // disable automatic connection
});

export default socket;
