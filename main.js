  //main.js
  const { app, BrowserWindow, ipcMain } = require("electron");
  const path = require("path");
  const { Client } = require("ssh2");
  const oracledb = require("oracledb");
  const { Console } = require("console");
  const crypto = require('crypto');

  function decrypt(encrypted) {
    let iv = Buffer.from(encrypted.iv, 'hex');
    let encryptedText = Buffer.from(encrypted.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
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

    console.log(`Original Directory Path: ${directoryPath}`);
    console.log(`Filename: ${filename}`);
    console.log(`Joined Path: ${joinedPath}`);
    console.log(`Normalized Path: ${normalizedPath}`);

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
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
      },
    });

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

    ipcMain.handle(
      "get-log-details",
      async (
        event,
        { directoryPath, ip, port, username, password, targetOS }
      ) => {
        let logDetails = null;
        let dumpFileInfo = null;
        let logFileName = null;
        let backupPath = directoryPath;

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

          if (targetOS === "solaris") {
            const allLogDetails = [];
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

                const logFiles = subDirFiles.filter(
                  (file) => path.extname(file.filename) === ".log"
                );

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

                  dumpFileInfo = await new Promise((resolve, reject) => {
                    sftp.readdir(subDirPath, (err, files) => {
                      if (err) {
                        console.error("Readdir error:", err);
                        sftp.end();
                        conn.end();
                        return reject(
                          new Error(
                            `Failed to read directory for dump file: ${err.message}`
                          )
                        );
                      }

                      const dumpFiles = files.filter((file) =>
                        [".DMP", ".dmp"].includes(
                          path.extname(file.filename).toUpperCase()
                        )
                      );

                      if (dumpFiles.length > 0) {
                        const latestDumpFile = dumpFiles.reduce((latest, file) =>
                          file.attrs.mtime > latest.attrs.mtime ? file : latest
                        );
                        const dumpFilePath = joinPath(
                          subDirPath,
                          latestDumpFile.filename,
                          targetOS
                        );

                        sftp.stat(dumpFilePath, (err, stats) => {
                          if (err) {
                            console.error("Stat error:", err);
                            sftp.end();
                            conn.end();
                            return reject(
                              new Error(
                                `Failed to stat dump file: ${err.message}`
                              )
                            );
                          }

                          const dumpFileSizeInBytes = stats.size;
                          const dumpFileSizeInMB = (
                            dumpFileSizeInBytes /
                            (1024 * 1024)
                          ).toFixed(2);

                          resolve({
                            filePath: dumpFilePath,
                            fileSize: parseFloat(dumpFileSizeInMB),
                          });
                        });
                      } else {
                        resolve(null);
                      }
                    });
                  });

                  allLogDetails.push({
                    logDetails,
                    dumpFileInfo,
                    logFileName,
                    ip,
                    backupPath: subDirPath,
                    os: targetOS
                  });
                }
              }
            }
            return allLogDetails;
          } else {
            // Existing logic for other OS
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
              logFileName = latestLogFile.filename;
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

              logDetails = parseLogLine(logData);

              dumpFileInfo = await new Promise((resolve, reject) => {
                sftp.readdir(directoryPath, (err, files) => {
                  if (err) {
                    console.error("Readdir error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(
                        `Failed to read directory for dump file: ${err.message}`
                      )
                    );
                  }

                  const dumpFiles = files.filter((file) =>
                    [".DMP", ".dmp"].includes(
                      path.extname(file.filename).toUpperCase()
                    )
                  );

                  if (dumpFiles.length > 0) {
                    const latestDumpFile = dumpFiles.reduce((latest, file) =>
                      file.attrs.mtime > latest.attrs.mtime ? file : latest
                    );
                    const dumpFilePath = joinPath(
                      directoryPath,
                      latestDumpFile.filename,
                      targetOS
                    );

                    sftp.stat(dumpFilePath, (err, stats) => {
                      if (err) {
                        console.error("Stat error:", err);
                        sftp.end();
                        conn.end();
                        return reject(
                          new Error(`Failed to stat dump file: ${err.message}`)
                        );
                      }

                      const dumpFileSizeInBytes = stats.size;
                      const dumpFileSizeInMB = (
                        dumpFileSizeInBytes /
                        (1024 * 1024)
                      ).toFixed(2);

                      resolve({
                        filePath: dumpFilePath,
                        fileSize: parseFloat(dumpFileSizeInMB),
                      });
                    });
                  } else {
                    resolve(null);
                  }
                });
              });
            }
          }

          sftp.end();
          conn.end();
        } catch (error) {
          console.error("Error fetching log details:", error);
          return { logDetails: null, dumpFileInfo: null };
        }

        return {
          logDetails,
          dumpFileInfo,
          logFileName,
          ip,
          backupPath,
        };
      }
    );

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
    // Función para recuperar los datos de los servidores
ipcMain.handle('get-servers', async () => {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: "USRMONBK",
      password: "USRMONBK_2024",
      connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
    });

    const result = await connection.execute(`SELECT IP, OS_Type, Port FROM ServerInfo`);
    return result.rows; // Devuelve las filas recuperadas
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

    lob.on('data', (chunk) => {
      data.push(chunk);
    });

    lob.on('end', () => {
      resolve(Buffer.concat(data));
    });

    lob.on('error', (err) => {
      reject(err);
    });
  });
}
const encryptionKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
function decrypt(encryptedData) {
  const data = JSON.parse(encryptedData.toString()); // Convertir el Buffer a cadena y luego parsear el JSON
  let iv = Buffer.from(data.iv, 'hex');
  let encryptedText = Buffer.from(data.encryptedData, 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

ipcMain.handle('verify-credentials', async (event, { ip, username, password }) => {
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

      console.log("Encrypted User Buffer:", encryptedUser);
      console.log("Encrypted Password Buffer:", encryptedPassword);

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
        return { success: false, message: 'Error al desencriptar los datos.' };
      }

      // Comparar las credenciales
      if (storedUser === username && storedPassword === password) {
        return { success: true, osType, port };
      } else {
        return { success: false, message: 'Usuario o contraseña incorrectos.' };
      }
    } else {
      return { success: false, message: 'Servidor no encontrado.' };
    }
  } catch (err) {
    console.error("Error al verificar las credenciales:", err);
    return { success: false, message: 'Error en la verificación de credenciales.' };
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

    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
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
    const duration = durationMatch ? durationMatch[1] : "N/A";

    console.log("Extracted Data:", { startDateTime, endDateTime, duration });

    return {
      startTime: startDateTime ? formatDateForOracle(startDateTime) : null,
      endTime: endDateTime ? formatDateForOracle(endDateTime) : null,
      duration: duration !== "N/A" ? duration : null,
      success: isSuccess ? 1 : 0,
    };
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

      // Verificar que las fechas sean válidas antes de intentar insertarlas
      // Convertir las cadenas de fecha a objetos Date
      const startTime = formatDateForOracle(logDetails.startTime);
      const endTime = formatDateForOracle(logDetails.endTime);
      if (!startTime || !endTime) {
        throw new Error("Fechas inválidas en los detalles del log");
      }

      console.log("Valores a insertar:", {
        horaINI: startTime,
        horaFIN: endTime,
        duration: logDetails.duration,
        success: logDetails.success ? 1 : 0,
        dumpFileSize_MB:
          dumpFileInfo && dumpFileInfo.fileSize ? dumpFileInfo.fileSize : null,
        serverName: targetOS,
        logFileName: logFileName,
        ip: ip,
        backupPath: backupPath,
      });

      const result = await connection.execute(
        `INSERT INTO LogBackup (horaINI, duration, success, dumpFileSize_MB, serverName, logFileName, horaFIN, ip, backupPath) 
          VALUES (
            TO_DATE(:horaINI, 'YYYY-MM-DD HH24:MI:SS'),
            :duration,
            :success,
            :dumpFileSize_MB,
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
          dumpFileSize_MB: dumpFileInfo && dumpFileInfo.fileSize ? dumpFileInfo.fileSize : null,
          serverName: targetOS,
          logFileName: logFileName,
          ip: ip,
          backupPath: backupPath
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