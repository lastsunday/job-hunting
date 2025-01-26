## 3.0.2 (2025-01-26)

### 🩹 Fixes

- fix check new version logic

### ❤️ Thank You

- lastsunday @lastsunday

## 3.0.1 (2025-01-26)

### 🩹 Fixes

- change build system to Nx what is a build system for monorepo

### ❤️ Thank You

- lastsunday @lastsunday

## 3.0.0 (2025-01-24)

### ⚠️ Noteworthy

1. 升级到3.x.x,由于底层数据库的更换,所有本地数据将会失效,有两种方法恢复数据:
    1. 开启数据共享计划,重新添加伙伴后,程序会自动进行数据的同步。
    2. 版本升级前，使用全量导出功能（职位数据，公司数据，职位标签数据，公司标签数据）导出数据,版本升级后，将导出的数据重新导入.
2. 数据库导出和数据库恢复功能暂不可用.

### 💣 BREAKING CHANGES

1. 底层数据库更换:SQLite更换为PGlite.

### 🚀 Performance

1. 优化招聘平台搜索页职位卡片额外信息的加载速度。

### 🔨 Dependency

1. Delete @0xecho/button
2. Delete @sqlite.org/sqlite-wasm
3. Update some lib

## 2.6.6 (2025-01-17)

### 🚀 Performance

1. 添加bridge invoke性能检测逻辑(开发模式下默认开启).
2. (ContentScript)减少职位标签的查询次数.
3. 提升部份查询的性能.(添加索引涉及的表有:job,job_browse_history,company_tag,job_tag)

### 🔨 Dependency

1. Delete @ant-design/charts
2. Delete react-sortable-hoc
3. Add dnd-kit
4. Upgrade react to v19

## 2.6.5 (2025-01-16)

### 🚀 Performance

1. 优化职位数据批量保存效率.
1. 优化公司数据批量保存效率.

### ✏️ Changed

1. 公司数据有效时间改为180天.
2. 共享数据追溯天数改为365天.

## 2.6.4 (2025-01-09)

### 🐛 Fixed

1. (Sidepanel)修复恢复容量较大的数据库出现异常的问题.

## 2.6.3 (2025-01-09)

### 🐛 Fixed

1. (Sidepanel)修复因数据库容量较大时数据库导出功能异常的问题.

### 🔨 Dependency

1. Update most of dependencies.

## 2.6.2 (2025-01-03)

### 🐛 Fixed

1. (ContentScript)修正职位卡片样式（拉勾网）.

## 2.6.1 (2024-12-25)

### 🐛 Fixed

1. (Sidepanel)修改标签公司职位占比图表，标签公司职位TOP图表的标签选项可搜索.

## 2.6.0 (2024-12-25)

### ⭐ Added

1. (Sidepanel)新增标签公司职位占比图表，标签公司职位TOP图表.

## 2.5.0 (2024-12-23)

### ⭐ Added

1. (Sidepanel)新增职位薪资分析图表.

### 🐛 Fixed

1. (Sidepanel)修复今天公司新增的描述单位。

## 2.4.0 (2024-12-23)

### ⭐ Added

1. (Sidepanel)添加文件管理页面。
2. 添加任务的最大执行次数限制。
3. 自动清理历史文件。（当前只保留共10MB历史文件）
4. (Sidepanel)添加系统页面(数据库信息展示，数据库调试，历史文件信息)。

## 2.3.0 (2024-12-21)

### ⭐ Added

1. (Sidepanel)添加GitHub API计量展示(Core,Graphql)。
1. (Sidepanel)添加职位标签统计图表(主页)。

### 🐛 Fixed

1. (Sidepanel)修复主页图表默认显示tooltip的问题。
2. (Sidepanel)修复任务修改时会变成新增的问题。

### 🔗 Build

1. 新增iconify图标离线打包。

### 🔨 Dependency

1. Update @ant-design/charts ^2.2.5
2. Add @iconify/json ^2.2.286
3. Add unplugin-icons ^0.22.0

## 2.2.0 (2024-12-20)

### ⭐ Added

1. (Sidepanel)添加数据库删除功能。

### ✏️ Changed

1. 更改公司标签，新增sourceType(来源类型)，source（来源）。

## 2.1.1 (2024-12-19)

### 🐛 Fixed

1. (Sidepanel)修复职位标签更新时间的格式。

## 2.1.0 (2024-12-19)

### ⭐ Added

1. (ContentScript)记录职位技能标签，职位福利标签。
2. 职位标签新增sourceType(来源类型)，source（来源）。
3. 标签新增是否公开选项字段。
4. (Sidepanel)新增标签管理页。

### 🐛 Fixed

1. (Sidepanel)修复自动化访问搜索页面时出现的网络错误提示。（执行自动化任务前清理网站的cookies（51JOB））

### 🔨 Dependency

1. Update puppeteer-core ^23.10.4
2. Add iconify-icon ^2.2.0

## 2.0.2 (2024-12-16)

### 🔗 Build

1. 修复admin页面unocss导入异常的问题

### 🔨 Dependency

1. Update wxt ^0.19.22

## 2.0.1 (2024-12-16)

### ✏️ Changed

1. 更新数据共享计划分析图表的布局。
2. 更换BOSS直聘职位信息API接口（暂无法获得职位发布时间）

### 🔨 Dependency

1. Add lit ^3.2.1
2. Add @webcomponents/custom-elements ^1.6.0
3. Add @unocss/preset-uno ^0.65.1
4. Add @wxt-dev/unocss ^1.0.0
5. Add unocss ^0.65.1

## 2.0.0 (2024-12-06)

### 💣 BREAKING CHANGES

1. Dev framework switch to WXT
2. Switch admin page js framework from Vue3 to ReactJS
3. Change UI Design

## 1.32.2 (2024-11-29)

### ✏️ Changed

1. (ContentScript)将职位信息请求的时机，转移到查询公司信息的时候。以便减少系统封控检查。（猎聘网）。
2. (ContentScript)右上角的信息展示区，不显示HR的在线信息（猎聘网）。
3. (ContentScript)将职位描述展示的触发覆盖到整个职位卡片区域。

## 1.32.1 (2024-11-21)

### 🐛 Fixed

1. (ContentScript)修复重复渲染的问题（BOSS直聘）。
2. (ContentScript)修复公司名为空时外包（教育机构）的判断逻辑。

## 1.32.0 (2024-11-21)

### ⭐ Added

1. (Sidepanel)首页新增统计图表
    1. 职位发布时间分析(按月)
    2. 职位发布时间分析(按周)
    3. 职位发布时间分析(按日)
    4. 职位发布时间分析(按小时)
    5. 职位发布平台分析
    6. 公司成立年份分段分析
    7. 公司社保人数分段分析

### ✏️ Changed

1. (Sidepanel)为任务统计图表添加Data Zoom slider。
2. (Sidepanel)将最近查看职位移至个人助理-浏览历史。

## 1.31.0 (2024-11-20)

### ⭐ Added

1. (Sidepanel)新增任务统计图表（数据上传,文件下载,数据合并,任务执行）。

### 🐛 Fixed

1. (Sidepanel)修复记录上传记录数查询。
2. (Sidepanel)修复数据文件下载大于1MB文件下载失败的问题。

### ✏️ Changed

1. (Sidepanel)修改公司数据增量上传逻辑。
2. (Sidepanel)修改数据上传错误处理逻辑。
3. (Sidepanel)为数据文件增加数据结构版本号。
4. (Sidepanel)任务列表内容调整。

## 1.30.2 (2024-11-18)

### 🐛 Fixed

1. (Sidepanel)修复职位页导出功能的内容格式。
2. (Sidepanel)修复数据同步的职位发布时间处理逻辑。

## 1.30.1 (2024-11-17)

### 🔨 Dependency

1. Update @sqlite.org/sqlite-wasm 3.47.0-build1

### 🔗 Build

1. build脚本使用pnpm进行依赖包安装和构建运行。

## 1.30.0 (2024-11-17)

### ⭐ Added

1. (ContentScript)新增职位标签显示与编辑。
2. (SidePanel)新增职位标签数据备份与导入。
3. (SidePanel)新增筛选条件：喜欢的职位标签，不喜欢的职位标签。（个人助理-职位偏好）
4. (SidePanel)新增职位标签显示(职位卡片,职位弹窗,地图职位图标,地图职位详情气泡,职位列表)。
5. (SidePanel)新增数据页面（职位标签）。

### 🐛 Fixed

1. (ContentScript)修复BOSS直聘推荐页样式错乱的问题。

## 1.29.2 (2024-11-13)

### ✏️ Changed

1. (SidePanel)职位卡片显示招聘人信息和招聘详情。
1. (SidePanel)地图图标和详情气泡显示招聘详情。

## 1.29.1 (2024-11-01)

### 🐛 Fixed

1. (ContentScript)修复爱企查公司列表样式错乱的问题。
2. (SidePanel)修复职位查询条件（职位扫描时间）逻辑错误的问题。
3. (SidePanel)修复职位卡片公司名过长的问题。
4. (SidePanel)修复地图上职位详情的职位名称过长无显示的问题。

### ✏️ Changed

1. (SidePanel)修改主页招聘网站导航的样式（添加平台LOGO）。
2. (SidePanel)修改地图上职位坐标点的样式（添加平台LOGO）。

## 1.29.0 (2024-10-25)

### ⭐ Added

1. (SidePanel)新增数据共享计划伙伴查找功能。
2. (SidePanel)新增数据共享计划伙伴列表用户页面跳转和仓库页面跳转。

## 1.28.0 (2024-10-10)

### ⭐ Added

1. (ContentScript)新增职位字段（公司名是否为全称）。
2. (SidePanel)新增数据共享计划（介绍页，任务列表，数据共享计划伙伴列表，后台任务特性）。
3. (SidePanel)新增讨论区可快速添加数据共享计划伙伴。

### 🔨 Dependency

1. @tsparticles/vue3 ^3.0.1
2. swiper ^11.1.14
3. tsparticles ^3.5.0

## 1.27.4 (2024-09-10)

### 🐛 Fixed

1. (ContentScript)修复职位公司名识别错误的问题。

### ✏️ Changed

1. (SidePanel)调整自动化任务添加与修改页面排版和样式。

### 🔨 Dependency

1. Update @vueuse/core ^11.0.3
2. Update @yaireo/tagify ^4.31.3
3. Update core-js ^3.38.1
4. Update dayjs ^1.11.13
5. Update element-plus ^2.8.2
6. Update marked ^14.1.2
7. Update puppeteer-core ^23.3.0
8. Update vue ^3.5.3
9. Update vue-echarts ^7.0.3
10. Update vue-router ^4.4.3
11. Update @types/chrome ^0.0.270
12. Update @types/webextension-polyfill ^0.12.1
13. Update @vitejs/plugin-vue ^5.1.3
14. Update sass ^1.78.0
15. Update typescript ^5.6.2
16. Update vite ^5.4.3
17. Update vue-tsc ^2.1.6

## 1.27.3 (2024-08-22)

### 🐛 Fixed

1. (ContentScript)修复智联招聘失效的问题。

## 1.27.2 (2024-08-10)

### ✏️ Changed

1. (SidePanel)自动化任务日志显示职位翻页截图。

## 1.27.1 (2024-08-10)

### 🐛 Fixed

1. (SidePanel)职位偏好和自动化页面标签组件样式错位的问题。

### 🔨 Dependency

1. Update element-plus ^2.8.0

## 1.27.0 (2024-08-10)

### ⭐ Added

1. (SidePanel)新增自动化任务，支持自动浏览职位搜索页（前程无忧，BOSS直聘，智联招聘，拉勾网，猎聘网）。

### 🔨 Dependency

1. Add puppeteer-core　^23.0.2
2. Add vuedraggable　^4.1.0
3. Add @rollup/plugin-node-resolve　^15.2.3

## 1.26.1 (2024-08-07)

### 🐛 Fixed

1. (SidePanel)修复开发者模式的应用流量API缓存问题。
2. (SidePanel)修复开发者模式的流行内容的Url地址。
3. (ContentScript)自动检测公司风评（信用中国(北京)黑名单）公司名匹配错误的问题。

## 1.26.0 (2024-08-06)

### ⭐ Added

1. (ContentScript)自动检测公司风评，支持IT黑名单 [www.blackdir.com](www.blackdir.com)。
2. (ContentScript)自动检测公司风评，支持信用中国(北京)黑名单 [creditbj.jxj.beijing.gov.cn](creditbj.jxj.beijing.gov.cn)。
3. (SidePanel)新增新版本自动检测（主框架）。

### 🐛 Fixed

1. (SidePanel)优化职位卡片样式（避免拥有足够空间的情况下出现横向滚动条）。

## 1.25.1 (2024-08-01)

### 🐛 Fixed

1. (ContentScript)修复职位排序错误的问题。

## 1.25.0 (2024-08-01)

### ⭐ Added

1. (SidePanel)新增筛选条件：职位名排除关键字。（个人助理-职位偏好）
2. (SidePanel)新增排序：最近发现在前面，最近发布在前面。（个人助理-职位偏好）
3. (SidePanel)新增今日新发现徽标到职位卡片。

## 1.24.0 (2024-07-31)

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

## 1.23.0 (2024-07-31)

### ⭐ Added

1. (SidePanel)新增开发者模式，流量监控页面。
2. (SidePanel)新增打开当前所有职位详情页。（个人助理-职位偏好）
3. (SidePanel)新增筛选条件，招聘人职位排除关键字。（个人助理-职位偏好）

### 🐛 Fixed

1. (SidePanel)修复换页时目标卡片信息的渲染错误的问题。
2. (SidePanel)修复换页时目标卡片定位错误的问题（个人助理-职位偏好）。

### ✏️ Changed

1. (SidePanel)调整个人助理-个人偏好职位的排序逻辑（先按扫描时间降序排列，再按首次发布时间降序排列）。

## 1.22.0 (2024-07-28)

### ⭐ Added

1. (SidePanel)新增职位数据全量导出，导入。
2. (ContentScript)新增BOSS直聘推荐页支持。

### ✏️ Changed

1. (SidePanel)优化数据导出，导入的用户体验（加载标识正常显示）。
2. (ContentScript)优化智联招聘获取职位详情失败时的错误提示。

## 1.21.1 (2024-07-28)

### ✏️ Changed

1. (SidePanel)调整最近查看职位样式，职位卡片样式（固定标题宽度），移除职位详情（替换为点击职位名弹出详情，点击公司名弹出详情）。
2. (SidePanel)职位偏好数据排序为发布时间降序。
3. (SidePanel)分页每页显示20条数据，换页滚动条置顶。

## 1.21.0 (2024-07-26)

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

## 1.20.1 (2024-07-20)

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

## 1.20.0 (2024-07-19)

### ⭐ Added

1. (SidePanel)添加公司信息查询链接（主页）。

### 🐛 Fixed

1. (ContentScript)更换网络请求无缓存请求方式，修复评论跨域问题。

### ✏️ Changed

1. (SidePanel)查看评论展开即执行一次查询。（讨论区）

## 1.19.0 (2024-07-18)

### ⭐ Added

1. (SidePanel)添加讨论区板块，根据省市区区分。

### 🐛 Fixed

1. (SidePanel)修复地图模式下的定位，气泡开启逻辑。

## 1.18.0 (2024-07-16)

### ⭐ Added

1. (ContentScript)自动检测公司风评，支持互联网企业黑名单(job.me88.top)。

### 🐛 Fixed

1. (SidePanel)修复新版本检测显示逻辑。

## 1.17.0 (2024-07-16)

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

## 1.16.0 (2024-07-15)

### ⭐ Added

1. (SidePanel)为首页，设置页面添加漫游式引导。
2. (SidePanel)添加版本说明，许可证。
3. (SidePanel)新版本检查，查看新版本更新历史，下载新版本安装文件，如何更新程序版本。

### 🐛 Fixed

1. (SidePanel)修复访问主页和问题反馈的跳转和按钮点击逻辑。

## 1.15.0 (2024-07-14)

### ⭐ Added

1. (Data)新增Config表。
2. (SidePanel)新增GitHub Oauth登录和GitHub App Install。
3. 新增manifest key以固定插件id。

### ✏️ Changed

1. (SidePanel)评论功能底层逻辑替换为GitHub Issues并联动Github App,实现查看公司（职位）评论，添加评论。

### 🔨 Dependency

1. Add @iconify/vue ^4.1.2

## 1.14.0 (2024-07-11)

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

## 1.13.0 (2024-07-10)

### ⭐ Added

1. (ContentScript)增强爱企查企业搜索页面。（显示额外信息，公司数据同步，公司标签编辑）

## 1.12.0 (2024-07-09)

### ⭐ Added

1. (SidePanel)公司管理页面（功能：统计，展示，搜索，导出，编辑标签）。
2. (SidePanel)公司数据导入，全量导出。
3. (SidePanel)导入校验公司数据文件，公司标签文件。

### ✏️ Changed

1. (SidePanel)修改设置页面功能描述。

### 🐛 Fixed

1. (ContentScript)修复页面样式（前程无忧，BOOS直聘）。

## 1.11.0 (2024-07-08)

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

## 1.10.0 (2024-06-26)

### ⭐ Added

1. (ContentScript)自动检查官网可达性。
2. (ContentScript)工信部,信用中国快捷查询。
3. (ContentScript)建站时间,备案信息自动查询。
4. (ContentScript)公司成立时间添加距今时间的可读文本。

## 1.9.0 (2024-06-23)

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

## 1.8.0 (2024-06-21)

### ⭐ Added

1. (ContentScript,Offscreen)持久化公司信息到数据库并作为缓存来减少第三方接口的访问频率。

### 🛀 Refactor

1. (OffScreen)重构Offscreen的代码，拆分woker.js的业务功能。

## 1.7.0 (2024-06-21)

### ⭐ Added

1. (ContentScript)支持猎聘网。

### 🐛 Fixed

1. (ContentScript)修复缺少显示公司成立时间的问题。

## 1.6.0 (2024-06-20)

### ⭐ Added

1. (ContentScript)自动检测公司风评📡，当前实现：若比邻黑名单。
2. (ContentScript)快捷查询公司信息（政府渠道）。
3. (ContentScript)自动快速查询公司信息（BOSS直聘需手动点击查询）。

### ✏️ Changed

1. (SidePanel)补全统计薪酬区间职位数的<3k,3k-6k的区间显示。

## 1.5.0 (2024-06-06)

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

## 1.4.0 (2024-06-01)

### ⭐ Added

1. (ContentScript)新增公司评论。

### 🗑️ Removed

1. (ContentScript)移除点赞数显示。

### 🚀 Performance

1. (build)生产环境不生成source map。

### 🔨 Dependency

1. 新增crypto-js ^4.2.0

## 1.3.0 (2024-05-31)

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

## 1.2.0 (2024-05-31)

### ⭐ Added

1. (ContentScript)BOSS招聘的职位显示顺序根据HR活跃时间进行排列。

## 1.1.1 (2024-05-30)

### 🐛 Fixed

1. (Data)修复Jobsdb的Id标识。

### 📔 Documentation

1. 增加运行截图

## 1.1.0 (2024-05-30)

### ⭐ Added

1. (SidePanel)管理页面回到顶部按钮。
2. (SidePanel)管理页面搜索表格新增列：最低薪资，最高薪资，几薪，学历。
3. (SidePanel)管理页面搜索表格新增排序列：首次浏览日期，发布日期，最低薪资，最高薪资，几薪，学历。
4. (ContentScript)显示职位发布时间与自动排序（支持jobsdb-hk）。

### ✏️ Changed

1. (SidePanel)调整管理页面表格显示样式。

### 🐛 Fixed

1. (Data)修复BOSS直聘按天算的薪资记录逻辑。

## 1.0.0 (2024-05-29)

### ⭐ Added

1. (ContentScript)显示职位发布时间与自动排序（支持BOSS,51Job,智联,拉钩）。
2. (ContentScript)显示外包公司和培训机构。
3. (ContentScript)职位评论。
4. (SidePanel)新增本地显示职位初次浏览时间，历史浏览次数。
5. (SidePanel)新增本地职位记录统计，查询，查询结果导出。
6. (SidePanel)新增数据备份，数据恢复。
