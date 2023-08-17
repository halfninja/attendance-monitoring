import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow;

// Load main window
const loadMainWindow = () => {
    // create the main window
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        resizable: true,
        width: 800,
        height: 600,
        minHeight: 500,
        minWidth: 700,
        maxWidth: 900,
        maxHeight: 700,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            devTools: !app.isPackaged,
            preload: path.join(__dirname, '/preload.js'),
        },
    });
    mainWindow.loadFile(path.join(__dirname, '/src/index.html'));
}

// App events
app.on('ready', async () => {
    loadMainWindow();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});