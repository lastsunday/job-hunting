export default function useService() {

    const mergeServiceMethod = (actionFunction, source) => {
        let keys = Object.keys(source);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            actionFunction.set(key, source[key]);
        }
    }

    return { mergeServiceMethod }
}