const crypto = require('crypto');
const oracledb = require('oracledb');

// Clave de encriptación (debe ser segura y almacenada en un lugar seguro)
const encryptionKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const iv = Buffer.from('abcdef0123456789abcdef0123456789', 'hex');

// Función para encriptar
function encrypt(text) {
  console.log(`Encriptando: ${text}`); // Log para depurar
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Conexión a la base de datos
async function insertServerInfo(id, ip, osType, port, user, password, serverName) {
  let connection;

  try {
    console.log("Encriptando usuario y contraseña...");
    // Encriptar el usuario y la contraseña
    const encryptedUser = encrypt(user);
    const encryptedPassword = encrypt(password);

    // Conectarse a la base de datos
    console.log("Conectando a la base de datos...");
    connection = await oracledb.getConnection({
      user: "USRMONBK",
      password: "USRMONBK_2024",
      connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
    });

    // Insertar los datos en la base de datos
    console.log("Insertando los datos en la base de datos...");

    const result = await connection.execute(
      `INSERT INTO ServerInfo (ID, IP, OS_Type, Port, EncryptedUser, EncryptedPassword, ServerName)
       VALUES (:id, :ip, :osType, :port, :encryptedUser, :encryptedPassword, :serverName)`,
      {
        id: id,
        ip: ip,
        osType: osType,
        port: port,
        encryptedUser: Buffer.from(JSON.stringify(encryptedUser)),
        encryptedPassword: Buffer.from(JSON.stringify(encryptedPassword)),
        serverName: serverName,
      },
      { autoCommit: true }
    );

    console.log("Datos insertados correctamente:", result);
  } catch (err) {
    console.error("Error al insertar datos en la base de datos:", err);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log("Conexión a la base de datos cerrada.");
      } catch (err) {
        console.error("Error al cerrar la conexión a la base de datos:", err);
      }
    }
  }
}

// Ejemplo de uso: insertar un servidor
insertServerInfo(1, '10.0.212.172', 'windows', 22, 'bknetworker', 'BKn3t$$2017','info7021');
insertServerInfo(2, '10.0.212.4', 'linux', 22, 'oracle', 'oracle19cR3','switch');
insertServerInfo(3, '10.0.212.211', 'solaris', 22, 'oracle', 'oracle12cR2','bantprod');
