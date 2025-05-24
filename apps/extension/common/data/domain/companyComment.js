import { genSha256 } from "@/common/utils";
export class CompanyComment {
  /**
  * 编号
  */
  id;
  /**
  * 公司编号 
  */
  companyId;
  /**
  * 公司名称
  */
  companyName;
  /**
  * 评论 
  */
  comment;
  /**
  * 情感
  */
  emotion;
  /**
  * 来源类型 
  */
  sourceType = 0;
  /**
  * 来源 
  */
  source;
  /**
  * 数据集名称 
  */
  sourceDataName;
  /**
  * 创建时间 
  */
  createDatetime;
  /**
  * 更新时间
  */
  updateDatetime;
}

export const genId = (item) => {
  let idShaContent = `${item.sourceType ?? ""}${item.source ?? ""}${item.sourceDataName ?? ""}${item.companyName}${item.comment}`;
  return genSha256(idShaContent);
}
export const SOURCE_TYPE_CUSTOM = 0;
export const SOURCE_TYPE_PLATFORM = 1;
