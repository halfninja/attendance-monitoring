const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDeviceList } = require('usb');
const fs = require('fs-extra');

// for development
require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

// Allow only one instance of the app
let isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
    app.quit()
};

let mainWindow;

const loadMainWindow = () => {
    // create the main window
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        resizable: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            devTools: !app.isPackaged,
            preload: path.join(__dirname, '/src/preload.js'),
        },
    });
    mainWindow.loadFile(path.join(__dirname, '/src/index.html'));
    // for development
    mainWindow.webContents.openDevTools(); 

    ipcMain.on('save-and-close', async (event, arg) => {
        await fs.writeFile(path.join(__dirname, '/data.csv'), arg);
        // force destroy the window to prevent the "onbeforeunload" event from being emitted
        mainWindow.destroy();
    });
}


app.on('ready', async () => {
    loadMainWindow();
    app.setAsDefaultProtocolClient('attendance-monitoring');
});
app.on('window-all-closed', (e) => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
    }
});