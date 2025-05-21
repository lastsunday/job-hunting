export class DataSharePlanConfigDTO {
  enable = false;
  privateDataSyncEnableConfig = new PrivateDataSyncEnableConfig();
  enablePublic = false;
  publicDataSyncEnableConfig = new PublicDataSyncEnableConfig();
}

export class PrivateDataSyncEnableConfig {
  job = true;
  company = true;
  companyTag = true;
  jobTag = true;
}

export class PublicDataSyncEnableConfig {
  jobPublic = true;
}
