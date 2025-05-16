import { CONFIG_KEY_DATA_SHARE_PLAN } from "@/common/config";
import { SearchDataSharePartnerBO } from "@/common/data/bo/searchDataSharePartnerBO";
import { DataSharePlanConfigDTO } from "@/common/data/dto/dataSharePlanConfigDTO";
import { _getConfigByKey } from "../configService";
import { _searchDataSharePartner } from "../dataSharePartnerService";

export async function getDataSharePlanConfig() {
  let dataSharePlanConfig = new DataSharePlanConfigDTO();
  const configValue = await _getConfigByKey(CONFIG_KEY_DATA_SHARE_PLAN);
  if (configValue && configValue.value) {
    dataSharePlanConfig = Object.assign(dataSharePlanConfig, JSON.parse(configValue.value));
  }
  return dataSharePlanConfig;
}

export async function calculateDataSharePartnerList() {
  const searchParam = new SearchDataSharePartnerBO();
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  searchParam.enable = true;
  return (await _searchDataSharePartner({ param: searchParam })).items;
}
