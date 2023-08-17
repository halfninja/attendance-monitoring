import { contextBridge } from 'electron';
import { setupConnection, formattedData, cardReaders } from "./modules";

// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    formattedData: () => {return formattedData;},
    cardReaders: () => {return cardReaders},
})

setupConnection();