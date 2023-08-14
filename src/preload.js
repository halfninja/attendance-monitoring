const { ipcRenderer, contextBridge } = require('electron')
const { SerialPort } = require('serialport');
const Papa = require('papaparse');

sessionStorage.clear();

let dataPair = [];
let formattedData = [];
let cardReaders = [];

const genFilePath = () => {
    ipcRenderer.send('genFilePath');
    const promise = new Promise((resolve, reject) => {
        ipcRenderer.on('genFilePath-reply', (event, args) => {
            resolve(args)
        });
    });
    return promise;
};

const renderAttendanceView = async () => {
    const filePath = await genFilePath();
    document.querySelector('#main').innerHTML = `
        <div class="attendance-view">
            <h1>Attendance Monitoring for ${sessionStorage.getItem('location')}</h1>
            <h1>Data stored in ${filePath}</h1>
            <div class="attendance-view_columns">
            <div id="attendance-view_timestamp"><p>Timestamp</p></div>
            <div id="attendance-view_universityId"><p>University ID</p></div>
            <div id="attendance-view_issueNumber"><p>Issue Number</p></div>
            <div id="attendance-view_serialNumber"><p>Serial Number</p></div>
        </div>
    `;
    // every 500ms check if the data has changed and update if it has
    setInterval(() => {
        if (document.getElementById('attendance-view_timestamp').childElementCount - 1 !== formattedData.length) {
            const timestampElement = document.createElement('p');
            timestampElement.innerHTML = formattedData[formattedData.length - 1].timestamp;
            document.getElementById('attendance-view_timestamp').appendChild(timestampElement);
            const universityIdElement = document.createElement('p');
            universityIdElement.innerHTML = formattedData[formattedData.length - 1].universityNumber;
            document.getElementById('attendance-view_universityId').appendChild(universityIdElement);
            const issueNumberElement = document.createElement('p');
            issueNumberElement.innerHTML = formattedData[formattedData.length - 1].issueNumber;
            document.getElementById('attendance-view_issueNumber').appendChild(issueNumberElement);
            const serialNumberElement = document.createElement('p');
            serialNumberElement.innerHTML = formattedData[formattedData.length - 1].serialNumber;
            document.getElementById('attendance-view_serialNumber').appendChild(serialNumberElement);
        }
    }, 500);
};

const renderLocationView = () => {
    document.querySelector('#main').innerHTML = `
        <form id="locationForm">
            <input class="locationFormInput" type="text" id="locationInput" placeholder="Your Location...">
            <p id="inputError"></p>
            <input class="submitButton" type="submit" value="Continue">
        </form>
    `;
    document.getElementById('locationInput').focus();

    document.getElementById('locationForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const locationElement = document.getElementById('locationInput');
        if (locationElement.value == '') {
            locationElement.animate({
                translate: ['0px', '20px', '-20px', '0px'],
                easing: ['ease-in-out'],
            }, 500);
            document.getElementById('inputError').innerText = 'Location must be at least one character.';
            return;
        }
        sessionStorage.setItem('location', locationElement.value);
        renderAttendanceView();
    });
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
            try {
                joinedData = JSON.parse(joinedData);
            } catch (err) {
                console.error(err);
                return alert(`The last card scanned failed with the following reason:\n${err} \n\nPlease try again.`);
            }
            // return on error
            if (joinedData.error !== '') return alert(`The last card scanned failed with the following reason:\n${joinedData.error} \n\nPlease try again.`);
            joinedData.timestamp = new Date().toLocaleString();
            
            // write the csv header if it doesn't exist
            if (formattedData.length == 0) {
                const csvHeader = '"serialNumber","universityNumber","issueNumber","startDate","error","timestamp"';
                ipcRenderer.send('writeCsv', csvHeader + '\n');
            }
            if (joinedData.serialNumber == formattedData[formattedData.length - 1]?.serialNumber && joinedData.universityNumber == formattedData[formattedData.length - 1]?.universityNumber) return;
            const asCSV = Papa.unparse([joinedData], { quotes: true, header: false }) + '\n';
            ipcRenderer.send('writeCsv', asCSV);
            formattedData.push(joinedData);
        }
    });
}

const setupConnection =  async () => {
    // Get a list of all the connected serial devices
    const serialPorts = await SerialPort.list();
    
    // Check which ones are card readers based on manufacturer
    serialPorts.forEach((port) => {
        if (port.manufacturer == 'wch.cn') {
            cardReaders.push(port);
        }
    })

    // If we found no card readers alert the user 
    if (cardReaders.length == 0) {
        alert('We couldn\'t find any card readers\nAre there any plugged in?');
    }

    // If there's only one reader, just start the connection
    if (cardReaders.length == 1) {
            startConnection(cardReaders[0].path)
            return renderLocationView();
    }

    // If we did find card readers, add them to the drop-down 
    cardReaders.forEach((cardReader) => {
        const element = document.createElement('option');
        element.value = cardReader.path;
        element.innerText = cardReader.friendlyName;
        document.getElementById('usbSelector').appendChild(element);
    })

    // If there's more than one reader, prompt the user to select one
    document.getElementById('usbSelectorButton').addEventListener(('click'), () => {
            const path = document.getElementById('usbSelector').value;
            if (path == '') {
                document.getElementById('inputError').innerText = 'Location must be at least one character.';
                return setupConnection();
            }
            if (path == 'mock') {
                return renderLocationView();
            }
            startConnection(path);
            return renderLocationView();
    })
};


// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    formattedData: () => {return formattedData;},
    cardReaders: () => {return cardReaders},
})

setupConnection();