// External modules
import express from 'express';
import http from 'http';
import os from 'os';
import {Server} from 'socket.io';

// My modules
import {log} from './logger.js';
import {handleConnection} from './socket.js';

const PORT = (parseInt(process.env.PORT) && parseInt(process.env.PORT)) ||
    (parseInt(process.argv[2]) && parseInt(process.argv[2])) || 5000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize app
app.use(express.static('client'));
io.on('connection', (socket) => handleConnection(socket, io));
server.listen(PORT, handleServerStartup);

// Displays logs on server startup
function handleServerStartup() {
  const networkInterfaces = os.networkInterfaces();
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
