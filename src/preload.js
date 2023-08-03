const { ipcRenderer, contextBridge } = require('electron')
const { getDeviceList } = require('usb');
const { SerialPort } = require('serialport');
const Papa = require('papaparse');

sessionStorage.clear();

let dataPair = [];
let formattedData = [];

// Create the serial port
const port = new SerialPort({
    path: 'COM4',
    baudRate: 115200,
})
port.on('error', (err) => {
    console.error(err)
})

// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    getDeviceList: getDeviceList,
    formattedData: () => {return formattedData;},
    genFilePath: () => {
        ipcRenderer.send('genFilePath');
        const promise = new Promise((resolve, reject) => {
            ipcRenderer.on('genFilePath-reply', (event, args) => {
                resolve(args)
            });
        });
        return promise;
    },
    saveAndClose: () => {
        // format the json data to csv data
        let csv = Papa.unparse(formattedData, { quotes: true });
        // send the csv data to the main process and request a window close
        ipcRenderer.send('save-and-close', csv);
    },
})

port.on('data', (data) => {
    data = data.toString();
    if (sessionStorage.getItem('location') == null) return;
    if (!data.includes('{') && !data.includes('}')) return;
    // prevents weird error that drove me insane :)
    if (data.includes('SW_CPU_RESET')) return dataPair = [];

    dataPair.push(data);

    // join the two json halves and push to formattedData array
    if (dataPair.length === 2) {
        let joinedData = dataPair[0] + dataPair[1];
        dataPair = [];
        joinedData = JSON.parse(joinedData);
        // return on error
        if (joinedData.error !== '') return alert(`The last card scanned failed with the following reason:\n${joinedData.error} \n\nPlease try again.`);
        joinedData.timestamp = new Date().toLocaleString();
        formattedData.push(joinedData);
    }
    if (formattedData.length > 1) {
        // check if the current card scan is the same as the last card scanned (more efficient than comparing to all the other cards but may let some duplicate cards scans through)
        if (formattedData[formattedData.length - 1].serialNumber == formattedData[formattedData.length - 2].serialNumber && formattedData[formattedData.length - 1].universityNumber == formattedData[formattedData.length - 2].universityNumber) {
            formattedData.pop();
        }
    }
});