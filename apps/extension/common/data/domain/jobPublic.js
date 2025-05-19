export class JobPublic {
  id;
  jobId;
  /**
   * 来源类型,0:CUSTOM;1:PLATFORM
   */
  sourceType = 0;
  /**
   * CUSTOM:null代表本地应用程序,【其他值】代表其他用户;PLATFORM:代表第三方平台;
   */
  source;
  createDatetime;
  updateDatetime;
}
