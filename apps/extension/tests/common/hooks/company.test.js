import { useCompany } from "../../../common/hooks/company";
const { convertCapitalValueFromString } = useCompany();
import { expect, test } from "vitest";

test("convertCapitalValueFromString should return valid value", () => {
    const capitalList = [
        { source: { capitalString: "-" }, expect: { value: null, currency: null } },
        { source: { capitalString: "" }, expect: { value: null, currency: null } },
        { source: { capitalString: null }, expect: { value: null, currency: null } },
        { source: { capitalString: "1(元)" }, expect: { value: 1, currency: "元" } },
        { source: { capitalString: "10(元)" }, expect: { value: 10, currency: "元" } },
        { source: { capitalString: "100(元)" }, expect: { value: 100, currency: "元" } },
        { source: { capitalString: "1,000(元)" }, expect: { value: 1000, currency: "元" } },
        { source: { capitalString: "0.0334万(元)" }, expect: { value: 334, currency: "元" } },
        { source: { capitalString: "1万(元)" }, expect: { value: 10000, currency: "元" } },
        { source: { capitalString: "10万(元)" }, expect: { value: 100000, currency: "元" } },
        { source: { capitalString: "981.8877万(元)" }, expect: { value: 9818877, currency: "元" } },
        { source: { capitalString: "7,160万(香港元)" }, expect: { value: 71600000, currency: "香港元" } },
        { source: { capitalString: "2,400,000万(日元)" }, expect: { value: 24000000000, currency: "日元" } },
        { source: { capitalString: "2,588.9678万(美元)" }, expect: { value: 25889678, currency: "美元" } },
    ]
    for (let i = 0; i < capitalList.length; i++) {
        const item = capitalList[i];
        const { value, currency } = convertCapitalValueFromString(item.source.capitalString);
        expect(value).eq(item.expect.value);
        expect(currency).eq(item.expect.currency);
    }
});
