# CHANGELOG

## 1.26.1(2024-08-07)

### 🐛 Fixed

1. (SidePanel)修复开发者模式的应用流量API缓存问题。
2. (SidePanel)修复开发者模式的流行内容的Url地址。
3. (ContentScript)自动检测公司风评（信用中国(北京)黑名单）公司名匹配错误的问题。

## 1.26.0(2024-08-06)

### ⭐ Added

1. (ContentScript)自动检测公司风评，支持IT黑名单 [www.blackdir.com](www.blackdir.com)。
2. (ContentScript)自动检测公司风评，支持信用中国(北京)黑名单 [creditbj.jxj.beijing.gov.cn](creditbj.jxj.beijing.gov.cn)。
3. (SidePanel)新增新版本自动检测（主框架）。

### 🐛 Fixed

1. (SidePanel)优化职位卡片样式（避免拥有足够空间的情况下出现横向滚动条）。

## 1.25.1(2024-08-01)

### 🐛 Fixed

1. (ContentScript)修复职位排序错误的问题。

## 1.25.0(2024-08-01)

### ⭐ Added

1. (SidePanel)新增筛选条件：职位名排除关键字。（个人助理-职位偏好）
2. (SidePanel)新增排序：最近发现在前面，最近发布在前面。（个人助理-职位偏好）
3. (SidePanel)新增今日新发现徽标到职位卡片。

## 1.24.0(2024-07-31)

### ⭐ Added

1. (ContentScript)自动添加若比邻黑名单，互联网企业黑名单标签。
2. (SidePanel)职位卡片公司标签来源页面跳转（若比邻黑名单，互联网企业黑名单标签）。

### 🐛 Fixed

1. (SidePanel)开发者模式无令牌访问时的错误提示。
2. (ContentScript)修复获取公司全称时职位信息更新失败的问题。

### ✏️ Changed

1. (SidePanel)定时刷新统计时，不刷新最近查看职位列表。
2. (SidePanel)最近查看列表标题样式修改。
3. (SidePanel)为表格添加加载中样式（最近查看职位，职位偏好列表，职位，公司，公司标签）。
4. (ContentScript)公司数据过期时间为90天。

## 1.23.0(2024-07-31)

### ⭐ Added

1. (SidePanel)新增开发者模式，流量监控页面。
2. (SidePanel)新增打开当前所有职位详情页。（个人助理-职位偏好）
3. (SidePanel)新增筛选条件，招聘人职位排除关键字。（个人助理-职位偏好）

### 🐛 Fixed

1. (SidePanel)修复换页时目标卡片信息的渲染错误的问题。
2. (SidePanel)修复换页时目标卡片定位错误的问题（个人助理-职位偏好）。

### ✏️ Changed

1. (SidePanel)调整个人助理-个人偏好职位的排序逻辑（先按扫描时间降序排列，再按首次发布时间降序排列）。

## 1.22.0(2024-07-28)

### ⭐ Added

1. (SidePanel)新增职位数据全量导出，导入。
2. (ContentScript)新增BOSS直聘推荐页支持。

### ✏️ Changed

1. (SidePanel)优化数据导出，导入的用户体验（加载标识正常显示）。
2. (ContentScript)优化智联招聘获取职位详情失败时的错误提示。

## 1.21.1(2024-07-28)

### ✏️ Changed

1. (SidePanel)调整最近查看职位样式，职位卡片样式（固定标题宽度），移除职位详情（替换为点击职位名弹出详情，点击公司名弹出详情）。
2. (SidePanel)职位偏好数据排序为发布时间降序。
3. (SidePanel)分页每页显示20条数据，换页滚动条置顶。

## 1.21.0(2024-07-26)

### ⭐ Added

1. (SidePanel)添加个人助理。（职位偏好）
2. (SidePanel)表格分页添加20条数据每页设置。
3. (SidePanel)添加职位卡片（首页，个人助理-职位偏好）。

### 🐛 Fixed

1. (SidePanel)修复TagInput空Tag赋值失效的问题。

### ✏️ Changed

1. (SidePanel)使用聚类显示地图上的点。（主页，职位页，公司页）
2. (SidePanel)调整菜单，聚合职位，公司，公司标签到数据。

### 🛀 Refactor

1. (ContentScript)rename 51job job list style name。

### 🔨 Dependency

1. Add vue-leaflet-markercluster ^0.6.1

## 1.20.1(2024-07-20)

### ✏️ Changed

1. (SidePanel)只显示打开状态的讨论。（讨论区）

### 🐛 Fixed

1. (SidePanel)调整管理页面的滚动条显示逻辑（需要滚动时才显示）。

### 🔗 Build

1. 当创建Tag,自动生成Release并自动上传chrome和firefox安装文件。

### 🔨 Dependency

1. Update dayjs ^1.11.12
2. Update echarts ^5.5.1
3. Update element-plus ^2.7.7
4. Update semver ^7.6.3
5. Update vue ^3.4.33
6. Update sass ^1.77.8
7. Update typescript ^5.5.3
8. Update vite ^5.3.4
9. Update vite-plugin-web-extension ^4.1.6
10. Update vue-tsc ^2.0.26

## 1.20.0(2024-07-19)

### ⭐ Added

1. (SidePanel)添加公司信息查询链接（主页）。

### 🐛 Fixed

1. (ContentScript)更换网络请求无缓存请求方式，修复评论跨域问题。

### ✏️ Changed

1. (SidePanel)查看评论展开即执行一次查询。（讨论区）

## 1.19.0(2024-07-18)

### ⭐ Added

1. (SidePanel)添加讨论区板块，根据省市区区分。

### 🐛 Fixed

1. (SidePanel)修复地图模式下的定位，气泡开启逻辑。

## 1.18.0(2024-07-16)

### ⭐ Added

1. (ContentScript)自动检测公司风评，支持互联网企业黑名单(job.me88.top)。

### 🐛 Fixed

1. (SidePanel)修复新版本检测显示逻辑。

## 1.17.0(2024-07-16)

### ⭐ Added

1. (SidePanel)显示职位信息时，将公司标签也一并显示。（针对主页，职位页）
2. (SidePanel)添加地图模式，地图范围搜索（职位页面，公司页面）。
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
