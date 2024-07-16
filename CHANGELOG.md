# CHANGELOG

## WIP

### ⭐ Added

1. (SidePanel)显示职位信息时，将公司标签也一并显示。（针对主页，职位页）
2. (SidePanel)添加地图模式（职位页面，公司页面）。
3. (SidePanel)主页最近查看职位新增分页功能。

### ✏️ Changed

1. (SidePanel)调整框架布局为全屏布局。

### 🐛 Fixed

1. (ContentScript)针对某些职位信息公司名不是全称的情况，在查询公司信息时进行补全处理。
2. (SidePanel)Unmounted页面时，清理定时器。
3. (SidePanel)修复主页最近查看职位的查询逻辑。

## 1.16.0(2024-07-15)

### ⭐ Added

1. (SidePanel)为首页，设置页面添加漫游式引导。
2. (SidePanel)添加版本说明，许可证。
3. (SidePanel)新版本检查，查看新版本更新历史，下载新版本安装文件，如何更新程序版本。

### 🐛 Fixed

1. (SidePanel)修复访问主页和问题反馈的跳转和按钮点击逻辑。

## 1.15.0(2024-07-14)

### ⭐ Added

1. (Data)新增Config表。
2. (SidePanel)新增GitHub Oauth登录和GitHub App Install。
3. 新增manifest key以固定插件id。

### ✏️ Changed

1. (SidePanel)评论功能底层逻辑替换为GitHub Issues并联动Github App,实现查看公司（职位）评论，添加评论。

### 🔨 Dependency

1. Add @iconify/vue ^4.1.2

## 1.14.0(2024-07-11)

### ⭐ Added

1. (SidePanel)新增主页。（最近查看职位时间线，地图，招聘网站和公司搜索快捷入口）
2. (SidePanel)显示LOGO。
3. (SidePanel)设置页面显示版本号，访问主页，问题反馈。
4. (SidePanel)Element Plus组件显示中文。
4. (ContentScript)新增JobItem坐标。（智联招聘)

### 🔨 Dependency

1. Add @vue-leaflet/vue-leaflet ^0.10.1
2. Add leaflet ^1.9.4
3. Add @pansy/lnglat-transform ^1.0.3

## 1.13.0(2024-07-10)

### ⭐ Added

1. (ContentScript)增强爱企查企业搜索页面。（显示额外信息，公司数据同步，公司标签编辑）

## 1.12.0(2024-07-09)

### ⭐ Added

1. (SidePanel)公司管理页面（功能：统计，展示，搜索，导出，编辑标签）。
2. (SidePanel)公司数据导入，全量导出。
3. (SidePanel)导入校验公司数据文件，公司标签文件。

### ✏️ Changed

1. (SidePanel)修改设置页面功能描述。

### 🐛 Fixed

1. (ContentScript)修复页面样式（前程无忧，BOOS直聘）。

## 1.11.0(2024-07-08)

### ⭐ Added

1. (SidePanel)职位列表新增职位查看次数，最近查看时间。
2. (SidePanel)职位列表新增招聘平台。
3. (SidePanel)统计新增今天/总职位查看次数。
4. (ContentScript)新增公司自定义标签（可添加，修改，拖拽排序）。
5. (Data)内置外包公司标签数据。
6. (SidePanel)公司标签管理页面，公司标签数据导出，导入。

### ✏️ Changed

1. (SidePanel)自动展开高级搜索条件

### 🐛 Fixed

1. (Offscreen)职位扫描计数逻辑修复。

### 🔨 Dependency

1. Add @yaireo/dragsort ^1.3.2
2. Add @yaireo/tagify ^4.27.0

## 1.10.0(2024-06-26)

### ⭐ Added

1. (ContentScript)自动检查官网可达性。
2. (ContentScript)工信部,信用中国快捷查询。
3. (ContentScript)建站时间,备案信息自动查询。
4. (ContentScript)公司成立时间添加距今时间的可读文本。

## 1.9.0(2024-06-23)

### ⭐ Added

1. Firefox 拓展实现
2. (ContentScript)记录和显示职位详情查看次数。

### ✏️ Changed

1. (ContentScript)移除sidePanel，将管理页移动到tab页上。
2. (ContentScript)处理发布时间时，将结果转换为Date对象，避免在firefox报clone undefined异常。

### 🛀 Refactor

1. (build)修改chrome编译目录为dist-chrome，firefox编译目录为dist-firefox
2. (build)修改ci脚本，为tag自动生成编译后的产物([chrome][firefox])-xx.xx.xx分支

### ⚙️ Chore

1. (devtool)新增chrome和firefox快速启动并加载插件的命令:`start:firefox`和`start:chrome`(备注：每次启动该会自动清理数据库)

### 🔨 Dependency

1. Add cross-env ^7.0.3
2. Add web-ext ^8.2.0

## 1.8.0(2024-06-21)

### ⭐ Added

1. (ContentScript,Offscreen)持久化公司信息到数据库并作为缓存来减少第三方接口的访问频率。

### 🛀 Refactor

1. (OffScreen)重构Offscreen的代码，拆分woker.js的业务功能。

## 1.7.0(2024-06-21)

### ⭐ Added

1. (ContentScript)支持猎聘网。

### 🐛 Fixed

1. (ContentScript)修复缺少显示公司成立时间的问题。

## 1.6.0(2024-06-20)

### ⭐ Added

1. (ContentScript)自动检测公司风评📡，当前实现：若比邻黑名单。
2. (ContentScript)快捷查询公司信息（政府渠道）。
3. (ContentScript)自动快速查询公司信息（BOSS直聘需手动点击查询）。

### ✏️ Changed

1. (SidePanel)补全统计薪酬区间职位数的<3k,3k-6k的区间显示。

## 1.5.0(2024-06-06)

### ⭐ Added

1. (SidePanel)新增统计图表：根据指定搜索条件统计薪酬区间职位数。
2. (SidePanel)新增管理页面搜索表格查询：地区，地址。

### ✏️ Changed

1. (SidePanel)修改表格排序为远程排序。
2. (SidePanel)新增Job Record时，对为空串的内容设置为NULL。

### 🐛 Fixed

1. (ContentScript)修复智联招聘Job List元素查找路径。

### 🚀 Performance

1. (build)将webpack替换为vite，加快开发期间的编译速度。

### 🛀 Refactor

1. 重构项目的目录结构，根据Chrome Extension的概念进行分类:background,contentScript,offscreen,sidepanel。
2. 使用vite-plugin-web-extension进行插件编译的管理。

## 1.4.0(2024-06-01)

### ⭐ Added

1. (ContentScript)新增公司评论。

### 🗑️ Removed

1. (ContentScript)移除点赞数显示。

### 🚀 Performance

1. (build)生产环境不生成source map。

### 🔨 Dependency

1. 新增crypto-js ^4.2.0

## 1.3.0(2024-05-31)

### ⭐ Added

1. (ContentScript)快捷查询公司信息，支持（小红书，脉脉，必应，Google，爱企查）。
2. (ContentScript)在职位卡片下显示应用LOGO。

### ✏️ Changed

1. (ContentScript)将展示次数移动到职位卡片的功能框里。
2. (SidePanel)修改job item browse的显示文案。

### 🛀 Refactor

1. (ContentScript)重构timeTag的渲染代码和promise的使用。

### 📔 Documentation

1. 修改运行截图
2. 新增浏览器支持
3. 新增Release版本安装说明

## 1.2.0(2024-05-31)

### ⭐ Added

1. (ContentScript)BOSS招聘的职位显示顺序根据HR活跃时间进行排列。

## 1.1.1(2024-05-30)

### 🐛 Fixed

1. (Data)修复Jobsdb的Id标识。

### 📔 Documentation

1. 增加运行截图

## 1.1.0(2024-05-30)

### ⭐ Added

1. (SidePanel)管理页面回到顶部按钮。
2. (SidePanel)管理页面搜索表格新增列：最低薪资，最高薪资，几薪，学历。
3. (SidePanel)管理页面搜索表格新增排序列：首次浏览日期，发布日期，最低薪资，最高薪资，几薪，学历。
4. (ContentScript)显示职位发布时间与自动排序（支持jobsdb-hk）。

### ✏️ Changed

1. (SidePanel)调整管理页面表格显示样式。

### 🐛 Fixed

1. (Data)修复BOSS直聘按天算的薪资记录逻辑。

## 1.0.0(2024-05-29)

### ⭐ Added

1. (ContentScript)显示职位发布时间与自动排序（支持BOSS,51Job,智联,拉钩）。
2. (ContentScript)显示外包公司和培训机构。
3. (ContentScript)职位评论。
4. (SidePanel)新增本地显示职位初次浏览时间，历史浏览次数。
5. (SidePanel)新增本地职位记录统计，查询，查询结果导出。
6. (SidePanel)新增数据备份，数据恢复。
