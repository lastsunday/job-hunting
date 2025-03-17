import { isBlank } from "../utils";

export function useJob() {

    const ageLimitCheckIgnoreRegexList = [`岁.*[学生|婴幼儿|儿童|女孩|男孩|小孩|学龄]`];
    const ageLimitCheckList = [`岁以下`, `岁之间`, `岁以上勿打扰`];
    const ageLimitCheckRegexList = [`[0-9]+[ ]*[周]?岁`,`年龄[0-9]+[ ]*[-|到]+[ ]*[0-9]+`];

    const age35LimitCheckIgnoreList = [`35岁以上`, `35以上`,`35岁-`,`35岁至`];
    const age35LimitCheckList = [`35岁`, `35以下`, `35岁之间`];

    const isAgeLimitFromDescription = (description) => {
        if (isBlank(description)) {
            return false;
        }
        for (const item of ageLimitCheckIgnoreRegexList) {
            if (description.match(item)) {
                return false;
            }
        }
        for (const item of ageLimitCheckList) {
            if (description.includes(item)) {
                return true;
            }
        }
        for (const item of ageLimitCheckRegexList) {
            if (description.match(item)) {
                return true;
            }
        }
        return false;
    }

    const isAgeLimitFromDescriptionBy35 = (description) => {
        if (isBlank(description)) {
            return false;
        }
        for (const item of age35LimitCheckIgnoreList) {
            if (description.includes(item)) {
                return false;
            }
        }
        for (const item of age35LimitCheckList) {
            if (description.includes(item)) {
                return true;
            }
        }
        return false;
    }

    return { isAgeLimitFromDescription, isAgeLimitFromDescriptionBy35 };
}