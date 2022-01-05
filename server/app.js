'use strict';

const PORT = (parseInt(process.env.PORT) && parseInt(process.env.PORT)) ||
    (parseInt(process.argv[2]) && parseInt(process.argv[2])) || 5000;

// External modules
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);

// My modules
const {handleConnection} = require('./socket.js');
const {log} = require('./logger.js');

// Initialize app
app.use(express.static('client'));
io.on('connection', (socket) => handleConnection(socket, io));
server.listen(PORT, handleServerStartup);

// Displays logs on server startup
function handleServerStartup() {
  const networkInterfaces = require('os').networkInterfaces();
  const primaryInterface = Object.values(networkInterfaces)
                               .flatMap(i => i)
                               .find(i => i.family === 'IPv4' && !i.internal);
  if (primaryInterface) {
    console.log(`listening on ${primaryInterface.address}:${PORT}`);
  } else {
    log('WARNING: No external IPv4 network interface in', networkInterfaces);
    console.log(`listening on port ${PORT}`);
  }
}
