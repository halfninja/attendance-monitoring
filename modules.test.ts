import * as module from './modules';
import { saveLocation } from './config.json'

jest
    .useFakeTimers()
    .setSystemTime(new Date('2020-01-01'));

// mock modules
jest.mock('uuid', () => ({
    v4: jest.fn(() => '00000000-0000-0000-0000-000000000000')
}));
jest.mock('fs-extra', () => ({
    appendFile: jest.fn(() => Promise.resolve())
}));

// mock window
window.alert = jest.fn((message) => { return `alerted ${message}` });

test('Generate File Path', async () => {
    window.sessionStorage.setItem('location', 'test');
    let filePath = await module.generateFilePath();
    filePath = filePath.replace(/\\/g, '/');
    expect(filePath).toBe(`${saveLocation}/1-1-2020-0-0-test-00000000-0000-0000-0000-000000000000.csv`);
});

describe('Handle Data', () => {
    test('Normal Data', () => {
        let formattedData = [];
        const mockData = {
            serialNumber: '123456789',
            universityNumber: '123456789',
            issueNumber: '123456789',
            startDate: '123456789',
            error: '',
            timestamp: null,
        };

        module.handleData(mockData, formattedData);
        expect(formattedData).toEqual([{
            serialNumber: '123456789',
            universityNumber: '123456789',
            issueNumber: '123456789',
            startDate: '123456789',
            error: '',
            timestamp: '01/01/2020, 00:00:00',
        }]);
    });
    test('Erroneous Data', () => {
        let formattedData = [];
        const mockData = {
            serialNumber: '123456789',
            universityNumber: '123456789',
            issueNumber: '123456789',
            startDate: '123456789',
            error: 'This is an error',
            timestamp: null,
        };

        let data = module.handleData(mockData, formattedData);
        expect(data).toBe(`alerted The last card scanned failed with the following reason:\n${mockData.error}\n\nPlease try again.`);
    });
});