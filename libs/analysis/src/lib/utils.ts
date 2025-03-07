export function convertEmptyStringToUndefined(value: string | undefined): string | undefined {
    if (value == undefined) {
        return undefined;
    } if (typeof value == 'string') {
        if (isEmpty(value) || isBlank(value)) {
            return undefined;
        } else {
            return value;
        }
    } else {
        return value;
    }
}

export const isEmpty = (str: string) => !str?.length;

export function isBlank(str: string) {
    return !str || /^\s*$/.test(str);
}