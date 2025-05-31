import { expect, test } from "vitest";
import pako from 'pako'

test('zip and unzip', async () => {
    // const deflate = new pako.Deflate();
    // deflate.push("Test", true);
    // if (deflate.err) {
    //     console.log(deflate.err);
    // }
    // const deflateResult = deflate.result;
    // const hexContent = toHex(deflateResult);
    // console.log(hexContent);
    const hexContent = `789c012400dbff313030363434206c696e742e796d6c00e5ced0af2db4606cc8dc5898bbe126a5badac2c50488117c4cefa1714f4b128ddea921a68f1f02da8af797a3`;
    const inflator = new pako.Inflate();
    // inflator.push(deflateResult, true)
    inflator.push(fromHex(hexContent), true);
    if (inflator.err) {
        throw `Pako error: ${inflator.msg}`
    }
    // console.log(new TextDecoder().decode(inflator.result));
})

const fromHex = (hex) =>
    Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export function toHex(buffer) {
    let hex = ''
    for (const byte of new Uint8Array(buffer)) {
        if (byte < 16) hex += '0'
        hex += byte.toString(16)
    }
    return hex
}
