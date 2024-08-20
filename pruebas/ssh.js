const net = require('net');

const server = '10.0.212.44';
const port = 22;

const socket = new net.Socket();

socket.setTimeout(3000); // Timeout de 3 segundos

socket.on('connect', function() {
    console.log('Conexión exitosa al puerto 22 en el servidor');
    socket.destroy();
});

socket.on('timeout', function() {
    console.error('Conexión a tiempo');
    socket.destroy();
});

socket.on('error', function(err) {
    console.error('Error en la conexión:', err.message);
});

socket.connect(port, server);
