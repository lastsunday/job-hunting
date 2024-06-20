# CHANGELOG

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
