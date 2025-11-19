import { Archive, ArchiveCompression, ArchiveFormat } from 'libarchive.js';
import JSZip from "jszip";

export async function getExcelDataFromZipFile(base64Content, dataTypeName) {
  const promise = new Promise((resolve, reject) => {
    JSZip.loadAsync(base64Content, { base64: true }).then(async zip => {
      const zipFile = zip.file(`${dataTypeName}.xlsx`);
      resolve(await zipFile.async("arraybuffer"));
    }).catch(e => {
      reject(e);
    })
  });
  return promise;
}

export async function zipFileToBlob(fileName, blobData) {
  const promise = new Promise((resolve, reject) => {
    const zip = new JSZip();
    zip.file(`${fileName}`, blobData);
    zip
      .generateAsync({
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
        type: "blob",
      })
      .then(function (content) {
        resolve(content);
      }).catch((e) => {
        reject(e);
      });
  });
  return promise;
}

export async function zipAdvanceFileToBlob({ fileName, blobData, compression = ArchiveCompression.XZ, format = ArchiveFormat.USTAR }) {
  const promise = new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const archiveFile = await Archive.write({
          files: [
            { file: blobData, pathname: `${fileName}` }
          ],
          outputFileName: fileName,
          compression,
          format,
          passphrase: null,
        });
        resolve(archiveFile);
      } catch (e) {
        reject(e);
      }
    }
    run();
  });
  return promise;
}

export async function unzipAdvanceFileToText({ fileName, file }) {
  const promise = new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const openFile = await Archive.open(file);
        const data = await openFile.extractFiles();
        const reader = new FileReader();
        reader.onloadend = () => {
          const text = reader.result;
          try {
            resolve(text);
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsText(data[`${fileName}`]);
      } catch (e) {
        reject(e);
      }
    }
    run();
  });
  return promise;
}

export async function unzipAdvanceFileToJson({ fileName, file }) {
  const promise = new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const openFile = await Archive.open(file);
        const data = await openFile.extractFiles();
        const reader = new FileReader();
        reader.onloadend = () => {
          const text = reader.result;
          try {
            resolve(JSON.parse(text));
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsText(data[`${fileName}`]);
      } catch (e) {
        reject(e);
      }
    }
    run();
  });
  return promise;
}

export async function zipFileToBase64(dataTypeName, excelData) {
  const promise = new Promise((resolve, reject) => {
    const zip = new JSZip();
    zip.file(`${dataTypeName}.xlsx`, excelData);
    zip
      .generateAsync({
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
        type: "base64",
      })
      .then(function (content) {
        resolve(content);
      }).catch((e) => {
        reject(e);
      });
  });
  return promise;
}
