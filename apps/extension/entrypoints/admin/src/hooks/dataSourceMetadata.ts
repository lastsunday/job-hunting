export function useDataSourceMetadata() {

  const sortFieldMap = {
    "createDatetime": "createDatetime",
    "updateDatetime": "updateDatetime",
    "seq": "seq",
  }

  const convertSortField = (key: any) => {
    return sortFieldMap[key];
  }

  return { convertSortField }
}
