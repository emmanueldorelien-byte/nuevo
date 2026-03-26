const { app, BrowserWindow } = require("electron");
const path = require("path");

let serverStarted = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL("http://127.0.0.1:5000/");
}

function startBackend() {
  if (serverStarted) return;
  serverStarted = true;

  const PORT = process.env.PORT || "5000";
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_52KoLFwTiCUc@ep-ancient-grass-a4khddsw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL no está definido.");
  }

  const isDev = !app.isPackaged;

  // En dev usamos dist/index.cjs del proyecto; en producción, resources/dist/index.cjs
  const serverEntry = isDev
    ? path.join(__dirname, "..", "dist", "index.cjs")
    : path.join(process.resourcesPath, "dist", "index.cjs");

  process.env.PORT = PORT;
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = DATABASE_URL;

  require(serverEntry); // esto levanta el servidor Express
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

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