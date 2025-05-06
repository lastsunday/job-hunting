export class DataSharePlanConfigDTO {
    enable = false;
    privateDataSyncEnableConfig = new PrivateDataSyncEnableConfig();
}

export class PrivateDataSyncEnableConfig {
    job = true;
    company = true;
    companyTag = true;
    jobTag = true;
}