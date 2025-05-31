export const fromHex = (hex) =>
    Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export function toHex(buffer) {
    let hex = ''
    for (const byte of new Uint8Array(buffer)) {
        if (byte < 16) hex += '0'
        hex += byte.toString(16)
    }
    return hex
}
