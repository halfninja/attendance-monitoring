import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { saveLocation } from './config.json'

let filePath: string;
let mainWindow: BrowserWindow;

// Generate file path
const generateFilePath = async () => {
    const date: Date = new Date();
    const day: number = date.getDate();
    const month: number = date.getMonth() + 1;
    const year: number = date.getFullYear();
    const hours: number = date.getHours();
    const minutes: number = date.getMinutes();
    let location: string;

    await mainWindow.webContents
        .executeJavaScript('sessionStorage.getItem("location");')
        .then(result => {location = result;});
    const fileName: string = `${day}-${month}-${year}-${hours}-${minutes}-${location}-${uuidv4()}.csv`;
    const filePath: string = path.join(saveLocation, fileName);
    return filePath;
}

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
            preload: path.join(__dirname, '/src/preload.js'),
        },
    });
    mainWindow.loadFile(path.join(__dirname, '/src/index.html'));

    ipcMain.on('writeCsv', async (event, arg) => {
        fs.appendFile(filePath, arg).catch(err => {
            console.error(err);
            dialog.showErrorBox('Error: Can\'t write', `Something went wrong with writing to the file:\n${err}\n\nIf you have it open please close it and try again`);
            return location.reload();
        });
    })
    ipcMain.on('genFilePath', async (event) => {
        filePath = await generateFilePath()
        event.reply('genFilePath-reply', filePath);
    })
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