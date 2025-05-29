export function useCompanyComment() {

  const sortFieldMap = {
    "createDatetime": "createDatetime",
    "updateDatetime": "updateDatetime",
  }

  const convertSortField = (key: any) => {
    return sortFieldMap[key];
  }


  const emotionFormat = (emotion) => {
    if (emotion > 0) {
      return "积极";
    } else if (emotion < 0) {
      return "消极";
    } else {
      return "中性";
    }
  }

  return { convertSortField, emotionFormat }
}
