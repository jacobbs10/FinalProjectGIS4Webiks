import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";
const socket = io(BASE_URL);

export const connectToSimulation = () => {
  socket.connect();
  return socket;
};

export const disconnectFromSimulation = () => {
  socket.disconnect();
};

// Event listeners for simulation updates
export const onResponderUpdate = (callback) => {
  socket.on('responder_update', callback);
};

export const onResponderArrived = (callback) => {
  socket.on('responder_arrived', callback);
};

// Remove event listeners
export const removeResponderUpdateListener = (callback) => {
  socket.off('responder_update', callback);
};

export const removeResponderArrivedListener = (callback) => {
  socket.off('responder_arrived', callback);
};
