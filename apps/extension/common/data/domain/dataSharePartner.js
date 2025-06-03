export class DataSharePartner {
  id;
  username;
  reponame;
  repoType;
  enable = true;
  config = new Config();
  createDatetime;
  updateDatetime;
}

export class Config {
  taskTypeList;
}
