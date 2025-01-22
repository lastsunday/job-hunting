export const GITHUB_URL = "https://github.com";
export const GITHUB_APP_CLIENT_ID = "Iv23liutsRB7F1OJkVIL";
export const GITHUB_APP_CLIENT_SECRET = "762e843b1d346533626fe2e9362834c30ad1408c";
export const GITHUB_URL_APP_INSTALL_AUTHORIZE = "https://github.com/apps/job-hunting-github-app/installations/new";
export const GITHUB_URL_AUTHORIZE = "https://github.com/login/oauth/authorize";
export const GITHUB_URL_GET_ACCESS_TOKEN = "https://github.com/login/oauth/access_token";
export const GITHUB_URL_API = "https://api.github.com";
export const GITHUB_URL_GET_USER = "https://api.github.com/user";
export const GITHUB_APP_INSTALL_CALLBACK_URL = "https://github.com/lastsunday/job-hunting-github-app/blob/main/INSTALL";
export const URL_GRAPHQL = "https://api.github.com/graphql";
export const GITHUB_APP_REPO = "lastsunday/job-hunting-github-app";
export const URL_POST_ISSUES = "https://api.github.com/repos/lastsunday/job-hunting-github-app/issues";

export const URL_TRAFFIC_CLONE = "https://api.github.com/repos/lastsunday/job-hunting/traffic/clones";
export const URL_TRAFFIC_POPULAR_PATHS = "https://api.github.com/repos/lastsunday/job-hunting/traffic/popular/paths";
export const URL_TRAFFIC_POPULAR_REFERRERS = "https://api.github.com/repos/lastsunday/job-hunting/traffic/popular/referrers";
export const URL_TRAFFIC_VIEWS = "https://api.github.com/repos/lastsunday/job-hunting/traffic/views";

export const DEFAULT_DATA_REPO = "job-hunting-data";

export const COMMENT_PAGE_SIZE = 30;

export const APP_URL_LATEST_VERSION = "https://api.github.com/repos/lastsunday/job-hunting/releases/latest";

export const APP_ID = "boibmngajpgmamamchfhahehbkdfilam";

export const UI_DEFAULT_PAGE_SIZE = 20;

//公司数据有效时间
export const COMPANY_DATA_EXPRIE_DAY = 180;//day
//最多重试60*24*2次，与TASK_LOOP_DELAY相关(一分钟任务最多会执行两次，执行一天都没完成，则不执行)
export const TASK_STATUS_ERROR_MAX_RETRY_COUNT = 2880;
export const TASK_DATA_DOWNLOAD_MAX_DAY = 365;//day
export const TASK_CHART_DEFAULT_RANGE_DAY = 14;//day
export const TASK_LOOP_DELAY = 30000;//ms

//历史文件最大保留容量，单位:byte，默认，10MB（0:不保留文件，负数:保留全部文件）
export const HISTORY_FILE_MAX_SIZE = 1024 * 1024 * 10;

//图表刷新间隔
export const CHARTS_LOOP_DELAY = 5000;//ms
//全局统计间隔
export const GLOBAL_STATISTIC_LOOP_DELAY = 30000;//ms

export const CONFIG_KEY_DATA_SHARE_PLAN = "CONFIG_KEY_DATA_SHARE_PLAN";
export const DEFAULT_REPO_TYPE = "GITHUB";

export const INVOKE_WARN_TIME_COST = 1000; //1000ms

export const KEY_GITHUB_USER = "KEY_GITHUB_USER";
export const KEY_GITHUB_OAUTH_TOKEN = "KEY_GITHUB_OAUTH_TOKEN";

export const JOB_MAX_EXPORT_SIZE = 6000;
export const COMPANY_MAX_EXPORT_SIZE = 6000;
export const JOB_TAG_MAX_EXPORT_SIZE = 10000;
export const COMPANY_TAG_MAX_EXPORT_SIZE = 10000;