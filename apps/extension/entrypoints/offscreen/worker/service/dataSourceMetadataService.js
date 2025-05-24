import { DataSourceMetadataSearchBO } from "@/common/data/bo/dataSourceMetadataSearchBO";
import { DataSourceMetadata } from "@/common/data/domain/dataSourceMetadata";
import BaseBridgeService, { fillBaseServiceMethod } from "./baseBridgeService";
import { BaseService } from "./baseService";
import { genInTextSql, genLikeSql, genRangeDatetimeConditionSql } from "./sqlUtil";
const TABLE_NAME = "data_source_metadata";
const TABLE_ID_COLUMN = "id";
const SERVICE_NAME = "dataSourceMetadata";
export const SERVICE_INSTANCE = new BaseService(TABLE_NAME, TABLE_ID_COLUMN,
  () => {
    return new DataSourceMetadata();
  },
  () => {
    return new DataSourceMetadataSearchBO();
  },
  (param) => {
    let whereCondition = "".concat(
      genInTextSql(param.id, "id"),
      genLikeSql(param.name, "name"),
      genRangeDatetimeConditionSql(param.startDatetimeForCreate, param.endDatetimeForCreate, 'create_datetime'),
      genRangeDatetimeConditionSql(param.startDatetimeForUpdate, param.endDatetimeForUpdate, 'update_datetime'),
    );
    return whereCondition;
  }
);
const DataSourceMetadataService = new BaseBridgeService(SERVICE_INSTANCE, SERVICE_NAME);
fillBaseServiceMethod({ bridgeService: DataSourceMetadataService, overrideCreateDatetime: true, overrideUpdateDatetime: true });

export default DataSourceMetadataService;
