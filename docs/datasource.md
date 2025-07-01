# 数据源

## 数据源仓库说明

1. 仓库目录结构

```
├── 2025                              //年份，格式YYYY
│   └── 07-01                         //月日，格式MM-DD
│       └── 深圳避雷公司.zip          //数据文件，格式xxx.zip（包含文件xxx.xlsx）备注：zip文件和xlsx文件的文件名必须相同
├── metadata.json                     //源数据，包含数据源元数据，可用的数据源列表
```

2. metadata.json 文件格式

```json
{
  "data": {
    "source": [
      {
        "name": ""    //数据源名称
        "config": {
          "taskTypeList": [
            {
              "name": "",                                 //名称
              "type": "COMPANY_COMMENT_DATA_DOWNLOAD",    //固定值，代表公司评论数据类型
              "emotion": "NEGATIVE",                      //情感导向，负面：NEGATIVE，积极：POSITIVE，正常：其他值
              "fileName": "深圳避雷公司",                             //数据文件名
              "description": "",                          //描述
              "retentionDay": 3650                      //数据保留时间，单位：天
            }
          ]
        },
        "repoType": "GITHUB",                         //固定值
        "reponame": "",                               //仓库名
        "username": "",                               //仓库用户名
        "description": ""                             //数据源描述
      }
    ]
  },
  "icon":"",                                          //元数据图标，格式为svg，注意转移字符
  "name": "",                                         //元数据名称
  "type": "GIT_METADATA",                             //固定值，GIT元数据类型
  "config": {
    "config": {
      "url": "",                                      //元数据git仓库地址，以http或https开头的地址
      "filePath": "metadata.json"                     //元数据文件名，一般取metadata.json
    }
  },
  "enable": true,                                   //是否开启
  "description": "",                                  //元数据描述
  "autoUpdateEnable": true                          //是否自动更新元数据
}
```

3. 公司评论数据文件格式

   | 公司 | 评论 |
   | ---- | ---- |
   | xxxx | yyyy |

   备注：

   1. 第一行的标题必须保留，插件会以标题来标识字段列的数据
   1. 公司：可以同时填写多家公司，换行隔开
   1. 公司或评论为空的行将被跳过

4. Q&A

   1. 如何更新数据？
      根据仓库目录结构，新建**年月日目录**，将整理后的数据文件**zip 文件**上传到新建的**年月日目录**里即可

   1. 如何快速测试文件格式是否正确
      打开插件后台页面 ->系统 ->数据管理 ->公司评论数据导入

      如果能正常导入 xlsx 文件，则代表该文件正常（当前不支持导入 zip 文件）

   1. 如何使用？

      1. 新增元数据：打开插件后台页面 ->数据源 ->元数据 ->从网络导入

         1.从网络导入，填入 **metadata.json** 的访问地址: <https://github.com/用户名/仓库名/raw/refs/heads/main/metadata.json>

      1. 添加数据源: 打开插件后台页面 ->数据源 ->列表 ->搜寻数据源 ->选中新增的元数据 ->选中并添加数据源

   1. 数据同步的逻辑是怎样的？
      插件会遍历整个仓库的年月日目录，根据 metadata.json 的规则进行数据的增量同步，公司评论信息采取 散列（公司名+评论）作为唯一标识进行去重逻辑。
