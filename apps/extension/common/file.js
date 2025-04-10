import { read, writeFileXLSX } from "xlsx";
import { getExcelDataFromZipFile } from "./zip";

export function getFileExtension(filename) {
    return filename.split('.').pop();
}

export function getFileName(filename) {
    return filename.replace("." + getFileExtension(filename), "");
}

export async function exportExcelFromBase64ZipFile(base64, fileName) {
    const wb = read(await getExcelDataFromZipFile(base64, getFileName(fileName)), { cellDates: true });
    writeFileXLSX(wb, fileName);
}

export const downloadBlob = function (data, fileName, mimeType) {
    const blob = new Blob([data], {
        type: mimeType,
    });
    const url = window.URL.createObjectURL(blob);
    downloadURL(url, fileName);
    setTimeout(function () {
        return window.URL.revokeObjectURL(url);
    }, 0);
};

export const downloadURL = function (data, fileName) {
    const a = document.createElement("a");
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = "display: none";
    a.click();
    a.remove();
};