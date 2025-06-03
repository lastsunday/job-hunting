import { CompanyCommentSearchBO } from "@/common/data/bo/companyCommentSearchBO";
import { genIdByCompanyName } from "@/common/data/domain/company";
import { CompanyComment } from "@/common/data/domain/companyComment";
import BaseBridgeService, { addServiceMethod, addTransactionServiceMethod, fillBaseServiceMethod, METHOD_ADD_OR_UPDATE, METHOD_BATCH_ADD_OR_UPDATE } from "./baseBridgeService";
import { BaseService } from "./baseService";
import { genEqTextConditionSql, genEqValueConditionSql, genInTextSql, genIsNullEqTextConditionSql, genLikeSql, genRangeDatetimeConditionSql } from "./sqlUtil";
const TABLE_NAME = "company_comment";
const TABLE_ID_COLUMN = "id";
const SERVICE_NAME = "companyComment";
export const SERVICE_INSTANCE = new BaseService(TABLE_NAME, TABLE_ID_COLUMN,
  () => {
    return new CompanyComment();
  },
  () => {
    return new CompanyCommentSearchBO();
  },
  (param) => {
    let whereCondition = "".concat(
      genInTextSql(param.id, "id"),
      genInTextSql(param.companyId, "company_id"),
      genLikeSql(param.companyName, "company_name"),
      genEqValueConditionSql(param.emotion, "emotion"),
      genEqValueConditionSql(param.sourceType, "source_type"),
      genIsNullEqTextConditionSql(param.source, "source"),
      genIsNullEqTextConditionSql(param.sourceDataName, "source_data_name"),
      genRangeDatetimeConditionSql(param.startDatetimeForCreate, param.endDatetimeForCreate, 'create_datetime'),
      genRangeDatetimeConditionSql(param.startDatetimeForUpdate, param.endDatetimeForUpdate, 'update_datetime'),
    );
    return whereCondition;
  }
);
const CompanyCommentService = new BaseBridgeService(SERVICE_INSTANCE, SERVICE_NAME);
fillBaseServiceMethod({ bridgeService: CompanyCommentService, overrideCreateDatetime: true, overrideUpdateDatetime: true });

addServiceMethod({
  bridgeService: CompanyCommentService, methodName: METHOD_ADD_OR_UPDATE, methodFunction: async ({ param }) => {
    param.companyId = genIdByCompanyName(param.companyName);
    return await SERVICE_INSTANCE._addOrUpdate(param, { overrideUpdateDatetime: true, overrideCreateDatetime: true });
  }
});

addTransactionServiceMethod({
  bridgeService: CompanyCommentService, methodName: METHOD_BATCH_ADD_OR_UPDATE, methodFunction: async ({ param, tx }) => {
    for (let i = 0; i < param.items.length; i++) {
      let item = param.items[i];
      item.companyId = genIdByCompanyName(item.companyName);
    }
    return await SERVICE_INSTANCE._batchAddOrUpdate(param.items,
      {
        overrideUpdateDatetime: param.overrideUpdateDatetime ?? true,
        overrideCreateDatetime: param.overrideCreateDatetime ?? true,
        connection: tx
      });
  }
});
export default CompanyCommentService;
