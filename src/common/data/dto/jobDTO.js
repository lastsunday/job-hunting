import { Job } from "../domain/job";

export class JobDTO extends Job{
    browseCount;
    browseDetailCount;
    latestBrowseDetailDatetime;
    companyTagDTOList;
    companyDTO;
}