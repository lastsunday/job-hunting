export function useJobPublic() {

  const sortFieldMap = {
    "createDatetime": "createDatetime",
    "updateDatetime": "updateDatetime",
  }

  const convertSortField = (key: any) => {
    return sortFieldMap[key];
  }

  return { convertSortField }
}
