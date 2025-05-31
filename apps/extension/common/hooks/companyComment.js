import { genId as companyCommentGenId } from "@/common/data/domain/companyComment";
export function useCompanyComment() {
  const filterCompanyCommentId = (list) => {
    const existsMap = new Map();
    const filterList = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const id = companyCommentGenId(item);
      if (!existsMap.has(id)) {
        existsMap.set(id, null);
        item.id = id;
        filterList.push(item);
      }
    }
    return filterList;
  }

  return { filterCompanyCommentId };
}
