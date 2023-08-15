import { CardData } from './types';
import { contextBridge } from 'electron';
import { SerialPort } from 'serialport';
import { handleData, renderLocationView } from "./modules";

let filePath: string;
let dataPair: Array<string> = [];
let formattedData: Array<CardData> = [];
// @ts-ignore
let cardReaders: Array<PortInfo> = [];

const startConnection = (path: string) => {
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
    
    port.on('data', (data: string) => {
        // example of data: {"serialNumber":"d477747c","universityNumber":"4109496","is. Looks like either the first or second half of a json object

        if (sessionStorage.getItem('location') == null) return;
        if (!data.includes('{') && !data.includes('}')) return;
        // prevents weird error that drove me insane :)
        if (data.includes('SW_CPU_RESET')) return dataPair = [];
        
        dataPair.push(data);
    
        // join the two json halves and push to formattedData array
        if (dataPair.length === 2) {
            // join the two halves 
            let JoinedData: string = dataPair[0] + dataPair[1]; // example of data: '{"serialNumber":"d477747c","universityNumber":"4109496","issueNumber":"04","startDate":""26/05/22"","error":""}'
            let parsedJoinedData: CardData;

            // reset the data pair
            dataPair = [];
            // attempt to parse the data, if it fails it means the halves weren't json and will return
            try {
                parsedJoinedData = JSON.parse(JoinedData);
            } catch (err) {
                console.error(err);
                return alert(`The last card scanned failed with the following reason:\n${err} \n\nPlease try again.`);
            }

            handleData(parsedJoinedData, formattedData);
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
            return renderLocationView(formattedData);
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
        const element = document.getElementById('usbSelector') as HTMLInputElement;
        const path: string = element.value;
        if (path == '') {
            document.getElementById('inputError').innerText = 'Location must be at least one character.';
            return setupConnection();
        }
        if (path == 'mock') {
            sessionStorage.setItem('mock', 'true');
            return renderLocationView(formattedData);
        }
        startConnection(path);
        return renderLocationView(formattedData);
    })
};


// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    formattedData: () => {return formattedData;},
    cardReaders: () => {return cardReaders},
})

setupConnection();