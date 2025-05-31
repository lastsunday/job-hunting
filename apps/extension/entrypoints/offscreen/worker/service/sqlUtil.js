import { dateToStr } from "@/common/utils/date";

export function genLikeSql(param, columnName) {
  let result = "";
  const paramList = convertParamToList(param);
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

export function genNotLikeSql(param, columnName) {
  let result = "";
  const paramList = convertParamToList(param);
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

function convertParamToList(param) {
  let paramList = [];
  if (typeof param === 'string') {
    if (param !== null && param !== undefined) {
      paramList.push(param);
    }
  } else if (Array.isArray(param)) {
    const list = param;
    for (let i = 0; i < param.length; i++) {
      const item = list[i];
      if (item !== null && item !== undefined) {
        paramList.push(item);
      }
    }
    paramList.push(...param);
  } else {
    if (typeof param !== 'undefined') {
      throw `unknow param type = ${param.constructor.name}`;
    } else {
      //skip
    }
  }
  return paramList;
}

export function genWhereSql(params) {
  let result = "";
  params.forEach(param => {
    const { include, sql } = param;
    if (include) {
      result += `${sql} `;
    }
  })
  return handleAndReturnWhereSql(result);
}

export function handleAndReturnWhereSql(whereCondition) {
  let result = whereCondition.trim();
  if (result.startsWith("AND ")) {
    result = result.replace("AND ", "");
    result = "WHERE " + result;
  }
  return result;
}

export function genDatetimeConditionSql(datetime, columnName, operation) {
  if (datetime) {
    let datetimeString = dateToStr(datetime);
    return ` AND ${columnName} ${operation} '${datetimeString}'`;
  } else {
    return "";
  }
}

export function genRangeDatetimeConditionSql(startDatetime, endDatetime, columnName) {
  let result = "";
  if (startDatetime || endDatetime) {
    if (startDatetime) {
      let startString = dateToStr(startDatetime);
      result += ` AND ${columnName} >= '${startString}'`;
    }
    if (endDatetime) {
      let endString = dateToStr(endDatetime);
      result += ` AND ${columnName} < '${endString}'`;
    }
  }
  return result;
}

export function genIsNullEqValueConditionSql(value, columnName) {
  return genIsNullValueConditionSql(value, columnName, "=");
}

export function genIsNullValueConditionSql(value, columnName, operation) {
  if (value !== undefined) {
    if (value === null) {
      return ` AND ${columnName} is null`;
    } else {
      return ` AND ${columnName} ${operation} ${value}`;
    }
  } else {
    return "";
  }
}

export function genIsNullEqTextConditionSql(value, columnName) {
  return genIsNullTextConditionSql(value, columnName, "=");
}

export function genIsNullTextConditionSql(value, columnName, operation) {
  if (value !== undefined) {
    if (value === null) {
      return ` AND ${columnName} is null`;
    } else {
      return ` AND ${columnName} ${operation} '${value}'`;
    }
  } else {
    return "";
  }
}

export function genEqValueConditionSql(value, columnName) {
  return genValueConditionSql(value, columnName, "=");
}

export function genValueConditionSql(value, columnName, operation) {
  if (value !== null && value !== undefined) {
    return ` AND ${columnName} ${operation} ${value}`;
  } else {
    return "";
  }
}

export function genEqTextConditionSql(text, columnName) {
  return genTextConditionSql(text, columnName, "=");
}

export function genTextConditionSql(text, columnName, operation) {
  if (text !== null && text !== undefined) {
    return ` AND ${columnName} ${operation} '${text}'`;
  } else {
    return "";
  }
}

export function genInValueSql(value, columnName,) {
  const list = [];
  if (Array.isArray(value)) {
    list.push(...value);
  } else {
    if (value !== undefined && value !== null) {
      list.push(value);
    }
  }
  if (list.length > 0) {
    const arraySplitString = list.join(",");
    return ` AND ${columnName} IN (${arraySplitString})`;
  } else {
    return "";
  }
}

export function genInTextSql(value, columnName,) {
  const list = [];
  if (Array.isArray(value)) {
    list.push(...value);
  } else {
    if (value !== undefined && value !== null) {
      list.push(value);
    }
  }
  if (list.length > 0) {
    const arraySplitString = "'" + list.join("','") + "'";
    return ` AND ${columnName} IN (${arraySplitString})`;
  } else {
    return "";
  }
}

