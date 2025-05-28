import { DataSourceMetadataSearchBO } from "@/common/data/bo/dataSourceMetadataSearchBO";
import { SERVICE_INSTANCE } from "../dataSourceMetadataService";

export async function calculateDataSourceMetadataList() {
  const searchParam = new DataSourceMetadataSearchBO();
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  searchParam.autoUpdateEnable = true;
  return (await SERVICE_INSTANCE._search(searchParam)).items;
}
