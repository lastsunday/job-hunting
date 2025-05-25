export const TYPE_GITHUB_GRAPHQL_SEARCH_REPO = "GITHUB_GRAPHQL_SEARCH_REPO";
export const TYPE_GIT_METADATA = "GIT_METADATA";
export const EMOTION_NEGATIVE = -1;
export const EMOTION_NORMAL = 0;
export const EMOTION_POSITIVE = 1;

export class DataSourceMetadata {
  /**
  * 编号
  */
  id;
  /**
  * 名称
  */
  name;
  /**
  * 描述
  */
  description;
  /**
  * 图标
  */
  icon;
  /**
  * 类型
  */
  type = TYPE_GIT_METADATA;
  /**
  * 配置
  */
  config = new ConfigGitMetadata();
  /**
  * 数据
  */
  data = new Data();
  /**
  * 开关
  */
  enable = true;
  /**
  * 排列序号
  */
  seq;
  /**
  * 自动更新开关
  */
  autoUpdateEnable = true;
  /**
  * 创建时间
  */
  createDatetime;
  /**
  * 更新时间
  */
  updateDatetime;
}

export class ConfigGithubGraphqlSearchRepo {
  repoName;
  config = new ConfigGithubGraphqlSearchRepoConfig();
}

export class ConfigGithubGraphqlSearchRepoConfig {
  taskTypeList = [];
}

export class TaskType {
  type;
}

export class ConfigGitMetadata {
  url;
  filePath;
}

export class Data {
  sourceList = [new Source()];
}

export class Source {
  name;
  repoType;
  username;
  reponame;
  description;
  config = new SourceConfig();
}

export class SourceConfig {
  name;
  type;
  fileName;
  emotion;
}
