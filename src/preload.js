const { ipcRenderer, contextBridge } = require('electron')
const { SerialPort } = require('serialport');
const Papa = require('papaparse');

sessionStorage.clear();

let dataPair = [];
let formattedData = [];
let cardReaders = [];

const renderLocationView = () => {
    document.querySelector('#main').innerHTML = `
        <form id="locationForm" onsubmit="event.preventDefault(); locationSubmit()">
            <input class="locationFormInput" type="text" id="locationInput" placeholder="Your Location...">
            <p id="inputError"></p>
            <input class="submitButton" type="submit" value="Continue">
        </form>
    `;
    document.getElementById('locationInput').focus();
};

const startConnection = (path) => {
    // Create the serial port
    const port = new SerialPort({
        path: path,
        baudRate: 115200,
    })
    port.on('error', (err) => {
        console.error(err);
        alert(`Something went wrong with the reader:\n${err}\n\nPlease try again or select a different device`);
        return location.reload();
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

}

const setupConnection =  async () => {
    let serialPorts = await SerialPort.list();
    
    serialPorts.forEach((port) => {
        if (port.manufacturer == 'wch.cn') {
            cardReaders.push(port);
        }
    })
    if (cardReaders.length == 0) {
        alert('We couldn\'t find any card readers\nAre there any plugged in?');
        return location.reload();
    }
    cardReaders.forEach((cardReader) => {
        const element = document.createElement('option');
        element.value = cardReader.path;
        element.innerText = cardReader.friendlyName;
        document.getElementById('usbSelector').appendChild(element);
    })
    if (cardReaders.length == 1) { // UNCOMMENT LATER
            startConnection(cardReaders[0].path)
            return renderLocationView();
    }

    document.getElementById('usbSelectorButton').addEventListener(('click'), () => {
            let path = document.getElementById('usbSelector').value;
            if (path == '') {
                alert('Please select an option');
                return setupConnection();
            }
            startConnection(path);
            return renderLocationView();
    })
};

// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    formattedData: () => {return formattedData;},
    cardReaders: () => {return cardReaders},
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

setupConnection();