let io = null;

module.exports = {
  init: (socketIoInstance) => {
    io = socketIoInstance;
    return io;
  },
  getIo: () => {
    if (!io) {
      console.warn('[Socket.IO] Instance requested before initialization.');
    }
    return io;
  },
  broadcast: (event, payload) => {
    if (io) {
      io.emit(event, payload);
    }
  }
};
