import { useJob } from "../../../common/hooks/job";
const { isAgeLimitFromDescription, isAgeLimitFromDescriptionBy35 } = useJob();
import { expect, test } from "vitest";

test("isAgeLimitFromDescription should return false for descriptions is blank", () => {
    const description1 = "";
    const description2 = null;
    const description3 = undefined;

    expect(isAgeLimitFromDescription(description1)).toBe(false);
    expect(isAgeLimitFromDescription(description2)).toBe(false);
    expect(isAgeLimitFromDescription(description3)).toBe(false);
});

test("isAgeLimitFromDescription should return true for descriptions containing age limit keywords", () => {
    const description1 = "适合30岁以下的人群";
    const description2 = "年龄在25岁之间的申请者";
    const description3 = "50岁以上勿打扰";
    const description4 = "年龄25-31";
    const description5 = "年龄25到31";
    const description6 = "年龄25 - 31";

    expect(isAgeLimitFromDescription(description1)).toBe(true);
    expect(isAgeLimitFromDescription(description2)).toBe(true);
    expect(isAgeLimitFromDescription(description3)).toBe(true);
    expect(isAgeLimitFromDescription(description4)).toBe(true);
    expect(isAgeLimitFromDescription(description5)).toBe(true);
    expect(isAgeLimitFromDescription(description6)).toBe(true);
});

test("isAgeLimitFromDescription should return false for descriptions containing ignore list keywords", () => {

    const descriptionList = [
        "适合20岁的学生",
        "5岁儿童",
        "5岁的儿童",
        "岁学龄",
        "岁婴幼儿",
        "岁女孩",
        "岁男孩",
        "岁小孩",
    ];
    for (const description of descriptionList) {
        expect(isAgeLimitFromDescription(description), description).toBe(false);
    }
});

test("isAgeLimitFromDescription should return true for descriptions matching regex patterns", () => {
    const description1 = "年龄限制为18岁";
    const description2 = "申请者需满21周岁";
    const description3 = "申请者需满21 周岁";
    const description4 = "申请者需满21 周岁";

    expect(isAgeLimitFromDescription(description1)).toBe(true);
    expect(isAgeLimitFromDescription(description2)).toBe(true);
    expect(isAgeLimitFromDescription(description3)).toBe(true);
    expect(isAgeLimitFromDescription(description4)).toBe(true);
});

test("isAgeLimitFromDescription should return false for descriptions matching regex patterns", () => {
    const description1 = "年龄限制为18a岁";
    const description2 = "申请者需满21b周岁";

    expect(isAgeLimitFromDescription(description1)).toBe(false);
    expect(isAgeLimitFromDescription(description2)).toBe(false);
});

test("isAgeLimitFromDescriptionBy35 should return false for descriptions is blank", () => {
    const description1 = "";
    const description2 = null;
    const description3 = undefined;

    expect(isAgeLimitFromDescriptionBy35(description1)).toBe(false);
    expect(isAgeLimitFromDescriptionBy35(description2)).toBe(false);
    expect(isAgeLimitFromDescriptionBy35(description3)).toBe(false);
});

test("isAgeLimitFromDescriptionBy35 should return true for descriptions containing 35 age limit keywords", () => {
    const description1 = "适合35岁以下的人群";
    const description2 = "年龄限制为35以下";

    expect(isAgeLimitFromDescriptionBy35(description1)).toBe(true);
    expect(isAgeLimitFromDescriptionBy35(description2)).toBe(true);
});

test("isAgeLimitFromDescriptionBy35 should return false for descriptions containing 35 ignore list keywords", () => {
    const description1 = "适合35岁以上的人群";
    const description2 = "年龄限制为35以上";

    expect(isAgeLimitFromDescriptionBy35(description1)).toBe(false);
    expect(isAgeLimitFromDescriptionBy35(description2)).toBe(false);
});
test("isAgeLimitFromDescription should return false for descriptions containing only ignored keywords", () => {
    const description1 = "适合20岁的学生";
    const description2 = "适合10岁的儿童";
    const description3 = "适合5岁的婴幼儿";

    expect(isAgeLimitFromDescription(description1)).toBe(false);
    expect(isAgeLimitFromDescription(description2)).toBe(false);
    expect(isAgeLimitFromDescription(description3)).toBe(false);
});

test("isAgeLimitFromDescription should return true for descriptions containing valid age limit patterns", () => {
    const description1 = "年龄限制为30岁以下";
    const description2 = "适合25岁之间的人群";
    const description3 = "50岁以上勿打扰";

    expect(isAgeLimitFromDescription(description1)).toBe(true);
    expect(isAgeLimitFromDescription(description2)).toBe(true);
    expect(isAgeLimitFromDescription(description3)).toBe(true);
});

test("isAgeLimitFromDescriptionBy35 should return true for descriptions explicitly mentioning 35岁以下", () => {
    const description1 = "适合35岁以下的人群";
    const description2 = "年龄限制为35以下";

    expect(isAgeLimitFromDescriptionBy35(description1)).toBe(true);
    expect(isAgeLimitFromDescriptionBy35(description2)).toBe(true);
});

test("isAgeLimitFromDescriptionBy35 should return false for descriptions explicitly mentioning 35岁以上", () => {
    const description1 = "适合35岁以上的人群";
    const description2 = "年龄限制为35以上";

    expect(isAgeLimitFromDescriptionBy35(description1)).toBe(false);
    expect(isAgeLimitFromDescriptionBy35(description2)).toBe(false);
});

test("isAgeLimitFromDescription should return false for descriptions with no age-related keywords", () => {
    const description1 = "这是一份普通的工作描述";
    const description2 = "欢迎所有人申请";
    const description3 = "无年龄限制";

    expect(isAgeLimitFromDescription(description1)).toBe(false);
    expect(isAgeLimitFromDescription(description2)).toBe(false);
    expect(isAgeLimitFromDescription(description3)).toBe(false);
});

test("isAgeLimitFromDescriptionBy35 should return false for descriptions with no 35-related keywords", () => {
    const description1 = "这是一份普通的工作描述";
    const description2 = "欢迎所有人申请";
    const description3 = "无年龄限制";

    expect(isAgeLimitFromDescriptionBy35(description1)).toBe(false);
    expect(isAgeLimitFromDescriptionBy35(description2)).toBe(false);
    expect(isAgeLimitFromDescriptionBy35(description3)).toBe(false);
});