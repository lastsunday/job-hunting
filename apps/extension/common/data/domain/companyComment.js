import { genSha256 } from "@/common/utils";
export class CompanyComment {
  id;
  companyId;
  companyName;
  comment;
  emotion;
  sourceType = 0;
  source;
  sourceDataName;
  createDatetime;
  updateDatetime;
}

export const genId = (item) => {
  let idShaContent = `${item.sourceType ?? ""}${item.source ?? ""}${item.sourceDataName ?? ""}${item.companyName}${item.comment}`;
  return genSha256(idShaContent);
}
