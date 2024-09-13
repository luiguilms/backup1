//main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { Client } = require("ssh2");
const oracledb = require("oracledb");
const { Console } = require("console");
const crypto = require("crypto");
// Función para normalizar rutas según el sistema operativo
function normalizePath(inputPath, targetOS) {
  let normalizedPath = inputPath.replace(/\\/g, "/");
  if (targetOS === "windows") {
    normalizedPath = normalizedPath.replace(/\//g, "\\");
  }
  return normalizedPath;
}
// Función para unir directorio y nombre de archivo
function joinPath(directoryPath, filename, targetOS) {
  const normalizedDirectoryPath = normalizePath(directoryPath, targetOS);
  const joinedPath = path.join(normalizedDirectoryPath, filename);
  const normalizedPath = normalizePath(joinedPath, targetOS);

  //console.log(`Original Directory Path: ${directoryPath}`);
  //console.log(`Filename: ${filename}`);
  //console.log(`Joined Path: ${joinedPath}`);
  //console.log(`Normalized Path: ${normalizedPath}`);

  return normalizedPath;
}
// Configuración de conexión a la base de datos
const dbConfig = {
  user: "USRMONBK",
  password: "USRMONBK_2024",
  connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
};
// Crea una ventana de aplicación
function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize(); // Maximiza la ventana
  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle(
    "connect-to-server",
    async (event, { ip, port, username, password }) => {
      console.log(
        `Attempting to connect to ${ip}:${port} with username ${username}`
      );
      const isConnected = await checkConnection(ip, port, username, password);
      return isConnected;
    }
  );
  function executeSSHCommand(conn, command) {
    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);

        let output = "";
        stream
          .on("data", (data) => {
            output += data.toString();
          })
          .on("close", (code, signal) => {
            resolve(output); // Resolvemos la promesa con el resultado del comando
          })
          .on("error", (err) => {
            reject(err);
          });
      });
    });
  }

  ipcMain.handle(
    "get-log-details",
    async (
      event,
      { directoryPath, ip, port, username, password, targetOS }
    ) => {
      let allLogDetails = [];

      try {
        console.log(`Fetching log details from directory: ${directoryPath}`);

        // Initialize SSH connection
        const conn = await createSSHClient(ip, port, username, password);
        // Initialize SFTP connection
        const sftp = await new Promise((resolve, reject) => {
          conn.sftp((err, sftp) => {
            if (err) {
              console.error("SFTP error:", err);
              conn.end();
              return reject(new Error(`SFTP error: ${err.message}`));
            }
            resolve(sftp);
          });
        });
        // Llamada a getFolderSize para Solaris, Linux, y Windows
        const folderSizes = await getFolderSize(
          conn,
          directoryPath,
          targetOS,
          sftp
        );
        console.log("Tamaños de las subcarpetas:", folderSizes);

        if (targetOS === "solaris") {
          // Asegurarse de que folderSizes sea un arreglo solo para Solaris
          if (!Array.isArray(folderSizes)) {
            throw new Error(
              "folderSizes no es un arreglo válido para Solaris."
            );
          }

          const files = await new Promise((resolve, reject) => {
            sftp.readdir(directoryPath, (err, files) => {
              if (err) {
                console.error("Readdir error:", err);
                sftp.end();
                conn.end();
                return reject(
                  new Error(`Failed to read directory: ${err.message}`)
                );
              }
              resolve(files);
            });
          });

          for (const file of files) {
            if (file.attrs.isDirectory()) {
              const subDirPath = joinPath(
                directoryPath,
                file.filename,
                targetOS
              );

              console.log(`Processing subdirectory: ${subDirPath}`);

              const subDirFiles = await new Promise((resolve, reject) => {
                sftp.readdir(subDirPath, (err, files) => {
                  if (err) {
                    console.error("Readdir error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(`Failed to read subdirectory: ${err.message}`)
                    );
                  }
                  resolve(files);
                });
              });
              // Encuentra el tamaño del subdirectorio directamente desde folderSizes sin realizar comparaciones
              const folderSizeInfo = folderSizes.find((folder) =>
                folder.folderPath.includes(file.filename)
              );
              const totalFolderSize = folderSizeInfo
                ? `${folderSizeInfo.sizeInMB} MB`
                : "N/A";

              console.log(
                "Tamaño total de la carpeta (totalFolderSize):",
                totalFolderSize
              );

              const logFiles = subDirFiles.filter(
                (file) => path.extname(file.filename) === ".log"
              );

              let dumpFileInfo = []; // Reinicia para cada subdirectorio
              let totalDmpSize = 0; // Reinicia para cada subdirectorio
              let logDetails = null;
              let logFileName = null;

              for (const logFile of logFiles) {
                logFileName = logFile.filename;
                const logFilePath = joinPath(subDirPath, logFileName, targetOS);

                console.log("Attempting to read log file:", logFilePath);

                await new Promise((resolve, reject) => {
                  sftp.stat(logFilePath, (err, stats) => {
                    if (err) {
                      console.error("Stat error:", err);
                      sftp.end();
                      conn.end();
                      return reject(
                        new Error(`Failed to stat log file: ${err.message}`)
                      );
                    }
                    resolve(stats);
                  });
                });

                const logData = await new Promise((resolve, reject) => {
                  sftp.readFile(logFilePath, "utf8", (err, data) => {
                    if (err) {
                      console.error("ReadFile error:", err);
                      sftp.end();
                      conn.end();
                      return reject(
                        new Error(`Failed to read log file: ${err.message}`)
                      );
                    }
                    resolve(data);
                  });
                });

                logDetails = parseLogLine(logData);

                const dumpFiles = subDirFiles.filter((file) =>
                  [".DMP", ".dmp"].includes(
                    path.extname(file.filename).toUpperCase()
                  )
                );

                for (const dumpFile of dumpFiles) {
                  const dumpFilePath = joinPath(
                    subDirPath,
                    dumpFile.filename,
                    targetOS
                  );

                  const dumpStats = await new Promise((resolve, reject) => {
                    sftp.stat(dumpFilePath, (err, stats) => {
                      if (err) {
                        console.error("Stat error:", err);
                        sftp.end();
                        conn.end();
                        return reject(
                          new Error(`Failed to stat dump file: ${err.message}`)
                        );
                      }
                      resolve(stats);
                    });
                  });

                  const dumpFileSizeInMB = dumpStats.size / (1024 * 1024);
                  totalDmpSize += dumpFileSizeInMB;

                  dumpFileInfo.push({
                    filePath: dumpFilePath,
                    fileSize:
                      dumpFileSizeInMB > 0
                        ? parseFloat(dumpFileSizeInMB.toFixed(2))
                        : 0,
                  });
                }
              }

              allLogDetails.push({
                logDetails,
                dumpFileInfo,
                logFileName,
                ip,
                backupPath: subDirPath,
                os: targetOS,
                totalDmpSize: totalDmpSize > 0 ? totalDmpSize.toFixed(2) : 0,
                totalFolderSize,
              });
              // Añade este log para verificar el valor
              console.log(
                "Tamaño de la carpeta (totalFolderSize):",
                totalFolderSize
              );
            }
          }
          return allLogDetails;
        } else {
          if (typeof folderSizes !== "number") {
            throw new Error(
              "folderSizes debe ser un número para Linux/Windows."
            );
          }
          // Logic for other OS (Windows, Linux)
          const files = await new Promise((resolve, reject) => {
            sftp.readdir(directoryPath, (err, files) => {
              if (err) {
                console.error("Readdir error:", err);
                sftp.end();
                conn.end();
                return reject(
                  new Error(`Failed to read directory: ${err.message}`)
                );
              }
              resolve(files);
            });
          });

          const logFiles = files.filter(
            (file) => path.extname(file.filename) === ".log"
          );

          if (logFiles.length > 0) {
            const latestLogFile = logFiles.reduce((latest, file) =>
              file.attrs.mtime > latest.attrs.mtime ? file : latest
            );
            let logFileName = latestLogFile.filename;
            const logFilePath = joinPath(directoryPath, logFileName, targetOS);

            console.log("Attempting to read log file:", logFilePath);

            await new Promise((resolve, reject) => {
              sftp.stat(logFilePath, (err, stats) => {
                if (err) {
                  console.error("Stat error:", err);
                  sftp.end();
                  conn.end();
                  return reject(
                    new Error(`Failed to stat log file: ${err.message}`)
                  );
                }
                resolve(stats);
              });
            });

            const logData = await new Promise((resolve, reject) => {
              sftp.readFile(logFilePath, "utf8", (err, data) => {
                if (err) {
                  console.error("ReadFile error:", err);
                  sftp.end();
                  conn.end();
                  return reject(
                    new Error(`Failed to read log file: ${err.message}`)
                  );
                }
                resolve(data);
              });
            });

            const logDetails = parseLogLine(logData);
            let dumpFileInfo = [];
            const dumpFiles = files.filter((file) =>
              [".DMP", ".dmp"].includes(
                path.extname(file.filename).toUpperCase()
              )
            );

            let totalDmpSize = 0;
            for (const dumpFile of dumpFiles) {
              const dumpFilePath = joinPath(
                directoryPath,
                dumpFile.filename,
                targetOS
              );

              const dumpStats = await new Promise((resolve, reject) => {
                sftp.stat(dumpFilePath, (err, stats) => {
                  if (err) {
                    console.error("Stat error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(`Failed to stat dump file: ${err.message}`)
                    );
                  }
                  resolve(stats);
                });
              });

              const dumpFileSizeInMB = dumpStats.size / (1024 * 1024);
              totalDmpSize += dumpFileSizeInMB;

              dumpFileInfo.push({
                filePath: dumpFilePath,
                fileSize:
                  dumpFileSizeInMB > 0
                    ? parseFloat(dumpFileSizeInMB.toFixed(2))
                    : 0,
              });
            }

            return [
              {
                logDetails,
                dumpFileInfo,
                logFileName,
                ip,
                backupPath: directoryPath,
                os: targetOS,
                totalDmpSize: totalDmpSize > 0 ? totalDmpSize.toFixed(2) : 0,
                totalFolderSize: `${folderSizes} MB`,
              },
            ];
          }
        }

        sftp.end();
        conn.end();
      } catch (error) {
        console.error("Error fetching log details:", error);
        return { logDetails: null, dumpFileInfo: null };
      }
    }
  );

  // Clave de encriptación (debe ser segura y almacenada en un lugar seguro)
  // Clave de encriptación (debe ser segura y almacenada en un lugar seguro)
  const encryptionKey = Buffer.from(
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "hex"
  );
  const iv = Buffer.from("abcdef0123456789abcdef0123456789", "hex");

  // Función para encriptar
  function encrypt(text) {
    let cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
  }

  // Conexión a la base de datos y función para insertar servidor
  async function insertServerInfo(
    id,
    ip,
    osType,
    port,
    encryptedUser,
    encryptedPassword,
    serverName
  ) {
    let connection;

    try {
      connection = await oracledb.getConnection({
        user: "USRMONBK",
        password: "USRMONBK_2024",
        connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
      });

      // Insertar datos en la base de datos, incluyendo un ID definido
      const result = await connection.execute(
        `INSERT INTO ServerInfo (ID, IP, OS_Type, Port, EncryptedUser, EncryptedPassword, ServerName)
       VALUES (:id, :ip, :osType, :port, :encryptedUser, :encryptedPassword, :serverName)`,
        {
          id: id, // Aquí el ID es pasado manualmente
          ip: ip,
          osType: osType,
          port: port,
          encryptedUser: Buffer.from(JSON.stringify(encryptedUser)),
          encryptedPassword: Buffer.from(JSON.stringify(encryptedPassword)),
          serverName: serverName,
        },
        { autoCommit: true }
      );

      console.log("Servidor insertado correctamente:", result);
    } catch (err) {
      console.error("Error al insertar servidor en la base de datos:", err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
  }

  // Modificación en el manejo del IPC para agregar un servidor con ID
  ipcMain.handle("add-server", async (event, serverData) => {
    const { serverName, ip, os, port, username, password, id } = serverData;

    try {
      console.log(`Agregando servidor: ${serverName}, IP: ${ip}, OS: ${os}`);
      const encryptedUser = encrypt(username);
      const encryptedPassword = encrypt(password);

      // Pasamos el ID manualmente al insertar el servidor
      await insertServerInfo(
        id,
        ip,
        os,
        port,
        encryptedUser,
        encryptedPassword,
        serverName
      );
      return { success: true };
    } catch (error) {
      console.error("Error al agregar el servidor:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "save-log-to-database",
    async (
      event,
      { logDetails, dumpFileInfo, targetOS, logFileName, ip, backupPath }
    ) => {
      try {
        await saveLogToDatabase(
          logDetails,
          dumpFileInfo,
          targetOS,
          logFileName,
          ip,
          backupPath
        );
        return { success: true };
      } catch (error) {
        console.error("Error saving log details to database:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("get-servers", async () => {
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: "USRMONBK",
        password: "USRMONBK_2024",
        connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
      });

      // Ajuste del orden de los campos que necesitas
      const result = await connection.execute(
        `SELECT ID, ServerName, IP, OS_Type, Port FROM ServerInfo`
      );
      return result.rows.map((row) => ({
        id: row[0],
        name: row[1],
        ip: row[2],
        os: row[3],
        port: row[4],
      }));
    } catch (err) {
      console.error("Error al recuperar datos de la base de datos:", err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
  });

  function readLob(lob) {
    return new Promise((resolve, reject) => {
      if (!lob) {
        return reject(new Error("Lob is undefined"));
      }

      let data = [];

      lob.on("data", (chunk) => {
        data.push(chunk);
      });

      lob.on("end", () => {
        resolve(Buffer.concat(data));
      });

      lob.on("error", (err) => {
        reject(err);
      });
    });
  }
  function decrypt(encryptedData) {
    const data = JSON.parse(encryptedData.toString()); // Convertir el Buffer a cadena y luego parsear el JSON
    let iv = Buffer.from(data.iv, "hex");
    let encryptedText = Buffer.from(data.encryptedData, "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    // Convertimos a string y eliminamos comillas adicionales
    let decryptedText = decrypted.toString().replace(/^"|"$/g, "");

    //console.log("Datos desencriptados:", decryptedText); // Verificar que se está desencriptando correctamente
    return decryptedText;
  }
  ipcMain.handle("get-server-details", async (event, serverId) => {
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);

      const result = await connection.execute(
        `SELECT ID, ServerName, IP, OS_Type, Port, EncryptedUser, EncryptedPassword 
         FROM ServerInfo WHERE ID = :id`,
        { id: serverId }
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const encryptedUserLob = row[5]; // EncryptedUser LOB
        const encryptedPasswordLob = row[6]; // EncryptedPassword LOB

        // Leer los LOBs de usuario y contraseña
        const encryptedUser = await readLob(encryptedUserLob);
        const encryptedPassword = await readLob(encryptedPasswordLob);

        // Aquí verificamos si ya está en texto claro
        let decryptedUser = encryptedUser.toString();
        let decryptedPassword = encryptedPassword.toString();

        // Verificamos si los valores están en texto claro o si necesitan desencriptarse
        if (
          decryptedUser.startsWith("{") &&
          decryptedUser.includes("encryptedData")
        ) {
          decryptedUser = decrypt(encryptedUser); // Desencripta solo si es necesario
        }

        if (
          decryptedPassword.startsWith("{") &&
          decryptedPassword.includes("encryptedData")
        ) {
          decryptedPassword = decrypt(encryptedPassword); // Desencripta solo si es necesario
        }

        console.log("Decrypted User:", decryptedUser); // Agregar este log
        console.log("Decrypted Password:", decryptedPassword); // Agregar este log

        return {
          id: row[0],
          serverName: row[1],
          ip: row[2],
          os: row[3],
          port: row[4],
          username: decryptedUser, // Usuario desencriptado o en texto claro
          password: decryptedPassword, // Contraseña desencriptada o en texto claro
        };
      } else {
        return { error: "Servidor no encontrado" };
      }
    } catch (err) {
      console.error("Error al obtener los detalles del servidor:", err);
      return { error: err.message };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión:", err);
        }
      }
    }
  });

  ipcMain.handle("delete-server", async (event, serverId) => {
    let connection;
    try {
      // Establecer conexión a la base de datos
      connection = await oracledb.getConnection({
        user: "USRMONBK",
        password: "USRMONBK_2024",
        connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
      });

      // Ejecutar la consulta de eliminación
      const result = await connection.execute(
        `DELETE FROM ServerInfo WHERE ID = :id`,
        { id: serverId },
        { autoCommit: true }
      );

      console.log(`Servidor con ID ${serverId} eliminado.`, result);

      // Verificar si se eliminó algún registro
      if (result.rowsAffected === 0) {
        return {
          success: false,
          error: `No se encontró el servidor con ID ${serverId}`,
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Error al eliminar el servidor:", err);
      return { success: false, error: err.message };
    } finally {
      // Cerrar la conexión
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión:", err);
        }
      }
    }
  });

  ipcMain.handle(
    "verify-credentials",
    async (event, { ip, username, password }) => {
      let connection;

      try {
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
          `SELECT EncryptedUser, EncryptedPassword, OS_Type, Port FROM ServerInfo WHERE IP = :ip`,
          { ip: ip }
        );

        if (result.rows.length > 0) {
          const encryptedUserLob = result.rows[0][0];
          const encryptedPasswordLob = result.rows[0][1];
          const osType = result.rows[0][2];
          const port = result.rows[0][3];

          if (!encryptedUserLob || !encryptedPasswordLob) {
            throw new Error("Encrypted User or Password Lob is undefined");
          }

          // Leer los Lobs
          const encryptedUser = await readLob(encryptedUserLob);
          const encryptedPassword = await readLob(encryptedPasswordLob);

          //console.log("Encrypted User Buffer:", encryptedUser);
          //console.log("Encrypted Password Buffer:", encryptedPassword);

          if (!encryptedUser || !encryptedPassword) {
            throw new Error("Failed to read Lob data");
          }

          // Desencriptar los datos
          let storedUser, storedPassword;
          try {
            storedUser = decrypt(encryptedUser);
            storedPassword = decrypt(encryptedPassword);
          } catch (decryptionError) {
            console.error("Error al desencriptar los datos:", decryptionError);
            return {
              success: false,
              message: "Error al desencriptar los datos.",
            };
          }

          // Comparar las credenciales
          if (storedUser === username && storedPassword === password) {
            return { success: true, osType, port };
          } else {
            return {
              success: false,
              message: "Usuario o contraseña incorrectos.",
            };
          }
        } else {
          return { success: false, message: "Servidor no encontrado." };
        }
      } catch (err) {
        console.error("Error al verificar las credenciales:", err);
        return {
          success: false,
          message: "Error en la verificación de credenciales.",
        };
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            console.error(
              "Error al cerrar la conexión a la base de datos:",
              err
            );
          }
        }
      }
    }
  );
  // Función para actualizar servidor en la base de datos
  async function updateServerInfo(id, name, ip, os, port, username, password) {
    let connection;

    try {
      connection = await oracledb.getConnection({
        user: "USRMONBK",
        password: "USRMONBK_2024",
        connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
      });

      // Actualizar datos del servidor
      const result = await connection.execute(
        `UPDATE ServerInfo 
       SET ServerName = :name, IP = :ip, OS_Type = :os, Port = :port, EncryptedUser = :username, EncryptedPassword = :password
       WHERE ID = :id`,
        {
          id: id,
          name: name,
          ip: ip,
          os: os,
          port: port,
          username: Buffer.from(JSON.stringify(username)), // Encripta el usuario
          password: Buffer.from(JSON.stringify(password)), // Encripta la contraseña
        },
        { autoCommit: true }
      );

      console.log("Servidor actualizado correctamente:", result);
      return result;
    } catch (err) {
      console.error("Error al actualizar servidor en la base de datos:", err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
  }

  // En el IPC handle para editar el servidor
  // En el manejador para actualizar el servidor
  ipcMain.handle("update-server", async (event, serverData) => {
    const { id, serverName, ip, os, port, username, password } = serverData;

    try {
      console.log(`Actualizando servidor: ${serverName}, IP: ${ip}, OS: ${os}`);

      // Eliminar comillas innecesarias en el username y password antes de encriptarlos
      const cleanUsername = username.replace(/^"|"$/g, "");
      const cleanPassword = password.replace(/^"|"$/g, "");

      const encryptedUser = encrypt(cleanUsername); // Encripta el usuario limpio
      const encryptedPassword = encrypt(cleanPassword); // Encripta la contraseña limpia

      const result = await updateServerInfo(
        id,
        serverName,
        ip,
        os,
        port,
        encryptedUser,
        encryptedPassword
      );
      console.log("Servidor actualizado correctamente:", result);

      return { success: true };
    } catch (error) {
      console.error("Error al actualizar el servidor:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("getBackupRoutesByIP", async (event, ip) => {
    console.log("IP recibida para obtener rutas:", ip);
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);

      const result = await connection.execute(
        `SELECT br.BackupPath, si.OS_Type 
       FROM BackupRoutes br 
       JOIN ServerInfo si ON br.ServerID = si.ID 
       WHERE si.IP = :ip`,
        { ip: ip }
      );

      console.log("Rutas obtenidas de la base de datos:", result.rows); // Añadir log

      return result.rows.map((row) => ({
        backupPath: row[0],
        os: row[1],
      }));
    } catch (error) {
      console.error("Error al obtener las rutas de backup:", error);
      return [];
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión:", err);
        }
      }
    }
  });
  async function getFolderSize(conn, directoryPath, os, sftp) {
    if (os === "solaris") {
      // Lógica para Solaris: Usar `du` para obtener el tamaño de todas las subcarpetas en un solo comando
      const command = `du -sk ${directoryPath}/* | awk '{print $1/1024, $2}'`; // Cambiamos aquí el awk para que no incluya "MB"
      const output = await executeSSHCommand(conn, command);
      console.log("Salida del comando du:", output);
  
      if (!output || output.trim() === "") {
        throw new Error("No se obtuvo salida del comando du");
      }
  
      // Aquí ajustamos cómo se parsea la salida del comando `du`
      return output
        .trim()
        .split("\n")
        .map((line) => {
          const parts = line.split(/\s+/); // Separar por cualquier espacio en blanco
          const sizeInMB = parts[0]; // El primer valor es el tamaño
          const folderPath = parts.slice(1).join(" "); // El resto es el folder path completo
          return {
            folderPath: folderPath.trim(), // Asegurarse de eliminar espacios en blanco
            sizeInMB: parseFloat(sizeInMB).toFixed(2), // Formatear el tamaño a dos decimales
          };
        });
    } else {
      // Lógica para Linux/Windows: solo se devuelve el tamaño total
      let totalSize = 0;

      const files = await new Promise((resolve, reject) => {
        sftp.readdir(directoryPath, (err, fileList) => {
          if (err) {
            return reject(err);
          }
          resolve(fileList || []); // Si fileList es null/undefined, devolver un arreglo vacío
        });
      });

      // Si 'files' no es un arreglo, muestra un error o un valor predeterminado
      if (!Array.isArray(files)) {
        console.error("Error: 'files' no es un arreglo válido.");
        return 0; // O cualquier valor predeterminado que prefieras
      }

      files.forEach((file) => {
        totalSize += file.attrs.size; // Suma los tamaños de los archivos
      });

      // Devuelve el tamaño total en MB
      return parseFloat((totalSize / (1024 * 1024)).toFixed(2)); // Asegura que devuelvas un número
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function createSSHClient(ip, port, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn
      .on("ready", () => {
        console.log("SSH Connection established");
        resolve(conn);
      })
      .on("error", (err) => {
        reject(new Error(`SSH Connection failed: ${err.message}`));
      })
      .connect({
        host: ip,
        port: port,
        username: username,
        password: password,
        algorithms: {
          kex: ["diffie-hellman-group14-sha1", "diffie-hellman-group14-sha256"],
          cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"],
          hmac: ["hmac-sha1", "hmac-sha2-256", "hmac-sha2-512"],
        },
      });
  });
}

function checkConnection(ip, port, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn
      .on("ready", () => {
        console.log("Initial connection successful");
        conn.exec('echo "Connection test"', (err, stream) => {
          if (err) {
            console.error("Exec error:", err);
            conn.end();
            reject(new Error(`Exec failed: ${err.message}`));
          }
          stream
            .on("close", (code, signal) => {
              conn.end();
              resolve(true);
            })
            .on("data", (data) => {
              console.log("Received:", data.toString());
            })
            .stderr.on("data", (data) => {
              console.error("STDERR:", data.toString());
            });
        });
      })
      .on("error", (err) => {
        resolve(false);
      })
      .connect({
        host: ip,
        port: port,
        username: username,
        password: password,
        algorithms: {
          kex: ["diffie-hellman-group14-sha1", "diffie-hellman-group14-sha256"],
          cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"],
          hmac: ["hmac-sha1", "hmac-sha2-256", "hmac-sha2-512"],
        },
      });
  });
}

// Función para parsear las fechas en el log y formatearlas para Oracle
function formatDateForOracle(date) {
  if (!date) return null;

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    console.error("Invalid date:", date);
    return null;
  }

  return dateObj
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/(\d+)\/(\d+)\/(\d+),/, "$3-$1-$2");
}

function parseLogLine(logContent) {
  const oraErrorPattern = /ORA-\d{5}/g;
  const oraSpecificErrorPattern = /ORA-39327/;
  const successPattern = /successfully completed/i;

  const hasOraSpecificError = oraSpecificErrorPattern.test(logContent);
  const hasSuccessMessage = successPattern.test(logContent);

  const isSuccess = hasOraSpecificError || hasSuccessMessage;

  const datePattern = /(\w{3} \w{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4})/g;
  const datesMatch = logContent.match(datePattern);

  let startDateTime = null;
  let endDateTime = null;

  if (datesMatch) {
    if (datesMatch.length > 0) {
      startDateTime = new Date(datesMatch[0]);
    }
    if (datesMatch.length > 1) {
      endDateTime = new Date(datesMatch[datesMatch.length - 1]);
    }
  }

  const durationPattern = /elapsed (\d{1,2} \d{2}:\d{2}:\d{2})/;
  const durationMatch = logContent.match(durationPattern);
  let duration = durationMatch ? durationMatch[1] : "N/A";

  // Elimina el "0 " si la duración comienza con "0 "
  if (duration.startsWith("0 ")) {
    duration = duration.substring(2); // Elimina los primeros dos caracteres "0 "
  }

  //console.log("Extracted Data:", { startDateTime, endDateTime, duration });

  return {
    startTime: startDateTime ? formatDateForOracle(startDateTime) : null,
    endTime: endDateTime ? formatDateForOracle(endDateTime) : null,
    duration: duration !== "N/A" ? duration : null,
    success: isSuccess ? 1 : 0,
  };
}
function formatFileSize(sizeInMB) {
  if (sizeInMB >= 1000) {
    let sizeInGB = (sizeInMB / 1000).toFixed(2);
    return `${sizeInGB} GB`;
  } else {
    return `${sizeInMB} MB`;
  }
}
async function saveLogToDatabase(
  logDetails,
  dumpFileInfo,
  targetOS,
  logFileName,
  ip,
  backupPath
) {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const startTime = formatDateForOracle(logDetails.startTime);
    const endTime = formatDateForOracle(logDetails.endTime);
    if (!startTime || !endTime) {
      throw new Error("Fechas inválidas en los detalles del log");
    }

    // Convertir el tamaño de archivo
    let totalDmpSize = 0;
    if (Array.isArray(dumpFileInfo)) {
      dumpFileInfo.forEach((file) => {
        totalDmpSize += parseFloat(file.fileSize) || 0;
      });
    }

    const formattedFileSize = formatFileSize(totalDmpSize); // Convierte a MB o GB

    // Verifica si dumpFileInfo es un array o un solo objeto y suma los tamaños
    if (Array.isArray(dumpFileInfo)) {
      dumpFileInfo.forEach((file) => {
        if (
          file &&
          file.filePath &&
          file.filePath.toLowerCase().endsWith(".dmp")
        ) {
          //console.log(`Found DMP file: ${file.filePath} with size ${file.fileSize}`);
          const fileSize = parseFloat(file.fileSize);
          if (!isNaN(fileSize)) {
            totalDmpSize += fileSize;
          }
        }
      });
    } else if (
      dumpFileInfo &&
      dumpFileInfo.filePath &&
      dumpFileInfo.filePath.toLowerCase().endsWith(".dmp")
    ) {
      console.log(
        `Found single DMP file: ${dumpFileInfo.filePath} with size ${dumpFileInfo.fileSize}`
      );
      const fileSize = parseFloat(dumpFileInfo.fileSize);
      if (!isNaN(fileSize)) {
        totalDmpSize += fileSize;
      }
    } else {
      console.warn(
        "dumpFileInfo is not a valid object or array:",
        dumpFileInfo
      );
    }

    // Convertimos totalDmpSize a un número con dos decimales si es mayor que 0
    const totalDmpSizeFormatted = totalDmpSize > 0 ? totalDmpSize : null;

    //console.log("Valores a insertar:", {
    //horaINI: startTime,
    //horaFIN: endTime,
    //duration: logDetails.duration,
    //success: logDetails.success ? 1 : 0,
    //dumpFileSize: formattedFileSize,
    //serverName: targetOS,
    //logFileName: logFileName,
    //ip: ip,
    //backupPath: backupPath,
    //});

    const result = await connection.execute(
      `INSERT INTO LogBackup (horaINI, duration, success, dumpFileSize, serverName, logFileName, horaFIN, ip, backupPath) 
        VALUES (
          TO_DATE(:horaINI, 'YYYY-MM-DD HH24:MI:SS'),
          :duration,
          :success,
          :fileSize,
          :serverName,
          :logFileName,
          TO_DATE(:horaFIN, 'YYYY-MM-DD HH24:MI:SS'),
          :ip,
          :backupPath
        )`,
      {
        horaINI: startTime,
        horaFIN: endTime,
        duration: logDetails.duration,
        success: logDetails.success ? 1 : 0,
        fileSize: formattedFileSize, // Guardar el valor con la unidad (MB o GB)
        serverName: targetOS,
        logFileName: logFileName,
        ip: ip,
        backupPath: backupPath,
      },
      { autoCommit: true }
    );
    console.log("Detalles del log guardados en la base de datos:", result);
  } catch (err) {
    console.error(
      "Error al guardar los detalles del log en la base de datos:",
      err
    );
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar la conexión con la base de datos:", err);
      }
    }
  }
}
