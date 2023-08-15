import { dialog } from "electron";
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveLocation } from './config.json';
import * as fs from 'fs-extra';


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