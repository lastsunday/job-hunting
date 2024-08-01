import dayjs from "dayjs";

export function genNotLikeSql(paramList, columnName) {
    let result = "";
    if (paramList && paramList.length > 0) {
        result += " AND (";
        paramList.forEach((item, index) => {
            if (index > 0) {
                result += " AND ";
            }
            result += ` ${columnName} NOT LIKE '%${item}%' `;
        });
        result += " )";
    }
    return result;
}

export function genLikeSql(paramList, columnName) {
    let result = "";
    if (paramList && paramList.length > 0) {
        result += " AND (";
        paramList.forEach((item, index) => {
            if (index > 0) {
                result += " OR ";
            }
            result += ` ${columnName} LIKE '%${item}%' `;
        });
        result += " )";
    }
    return result;
}

export function handleAndReturnWhereSql(whereCondition) {
    let result = whereCondition;
    if (result.startsWith(" AND")) {
        result = result.replace("AND", "");
        result = " WHERE " + result;
    }
    return result;
}

export function genDatetimeConditionSql(datetime, columnName, operation) {
    if (datetime) {
        let datetimeString = dayjs(datetime).format("YYYY-MM-DD HH:mm:ss");
        return ` AND ${columnName} ${operation} '${datetimeString}'`;
    } else {
        return "";
    }
}

export function genValueConditionSql(value, columnName, operation) {
    if (value) {
        return ` AND ${columnName} ${operation} ${value}`;
    } else {
        return "";
    }
}

export function genTextConditionSql(text, columnName, operation) {
    if (text) {
        return ` AND ${columnName} ${operation} '${text}'`;
    } else {
        return "";
    }
}