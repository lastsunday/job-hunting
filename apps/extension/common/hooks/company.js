import { isEmpty, isBlank } from "../utils";

export function useCompany() {
    const CAPITAL_MATCH = /(?<value>[0-9,\\.]*)(?<coefficient>.*)\((?<currency>.*)\)/;

    const convertCapitalValueFromString = (capitalString) => {
        if (isEmpty(capitalString) || isBlank(capitalString) || capitalString == "-") {
            return {
                value: null,
                currency: null
            };
        } else {
            const groups = capitalString.match(CAPITAL_MATCH)?.groups;
            let coefficient = 1;
            if (groups.coefficient == "万") {
                coefficient = 10000;
            }
            const value = Number.parseFloat(groups.value.replaceAll(",", "")) * coefficient;
            const currency = groups.currency;
            return {
                value,
                currency
            };
        }
    }

    return { convertCapitalValueFromString };
}