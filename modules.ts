import { dialog } from "electron";
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveLocation } from './config.json';
import * as fs from 'fs-extra';
import { CardData } from "./types";
import { unparse } from "papaparse";


// Generate file path
export const generateFilePath = async () => {
    const date: Date = new Date();
    const day: number = date.getDate();
    const month: number = date.getMonth() + 1;
    const year: number = date.getFullYear();
    const hours: number = date.getHours();
    const minutes: number = date.getMinutes();
    let location: string = sessionStorage.getItem("location");

    const fileName: string = `${day}-${month}-${year}-${hours}-${minutes}-${location}-${uuidv4()}.csv`;
    const filePath: string = path.join(saveLocation, fileName);
    return filePath;
}

export const appendCSVFile = async (data: string, filePath: string) => {
    fs.appendFile(filePath, data).catch(err => {
        console.error(err);
        dialog.showErrorBox('Error: Can\'t write', `Something went wrong with writing to the file:\n${err}\n\nIf you have it open please close it and try again`);
        return location.reload();
    });

}

export const handleData = (data: CardData, formattedData: Array<CardData>, filePath: string) => {
    // return on error
    if (data.error !== '') return alert(`The last card scanned failed with the following reason:\n${data.error} \n\nPlease try again.`);
    data.timestamp = new Date().toLocaleString();
    
    // write the csv header to the file if it doesn't exist
    if (formattedData.length == 0) {
        const csvHeader = '"serialNumber","universityNumber","issueNumber","startDate","error","timestamp"';
        appendCSVFile(csvHeader + '\n', filePath);
    }
    // compare the serial number and university number to the last entry in the array, if they are the same data (prevents rapid duplicate entries)
    if (data.serialNumber == formattedData[formattedData.length - 1]?.serialNumber && data.universityNumber == formattedData[formattedData.length - 1]?.universityNumber) return;

    // convert the json to csv and write to the file
    const asCSV: string = unparse([data], { quotes: true, header: false });  // example of data: "d477747c","4109496","04","26/05/22","","27/06/1987 12:00:00"
    appendCSVFile(asCSV + '\n', filePath);
    // push the data to the array for other functions to use
    formattedData.push(data);
};
