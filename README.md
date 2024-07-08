<p align="center">
    <img width="180" src="docs\logo.png" alt="Vite logo">
</p>

# Job Hunting - 一款协助找工作的浏览器插件

## 招聘平台支持列表

| 招聘平台  | 访问地址                            | 备注                   |
| --------- | ----------------------------------- | ---------------------- |
| BOSS 直聘 | https://www.zhipin.com/web/geek/job |                        |
| 前程无忧  | https://we.51job.com/pc/search      |                        |
| 智联招聘  | https://sou.zhaopin.com/            |                        |
| 拉钩网    | https://www.lagou.com/wn/zhaopin    |                        |
| jobsdb-hk | https://hk.jobsdb.com/              | 需点击搜索按钮才有效果 |
| 猎聘网    | https://www.liepin.com/zhaopin      | 需点击搜索按钮才有效果 |

## 功能列表

1. 显示职位发布时间与自动排序(按职位发布时间,hr 活跃时间（只支持 BOSS）)。
2. 快捷查询公司信息 🔎（互联网渠道，政府渠道）。
3. 自动检测公司风评 📡，当前支持：若比邻黑名单。
4. 自动快速查询公司信息并保存到数据库（BOSS 直聘和猎聘网需手动点击查询）。
5. 自动查询官网可达性，建站时间和备案信息。
6. 本地显示职位初次浏览时间，历史浏览次数，职位详情查看次数。
7. 本地职位记录统计，查询，查询结果导出。
8. 数据备份，数据恢复。
9. 职位评论，公司评论。（当前采用 ECHO 作为评论平台，请遵守相关法律法规合法留言）
10. 数据统计图表
    1. 根据指定搜索条件统计薪酬区间职位数（薪酬计算方式：(最低薪资+最高薪资)/2）
11. 公司自定义标签（可添加，修改，拖拽排序），内置外包公司标签数据。
12. 公司标签管理页面，公司标签数据导出，导入。

## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/> Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Firefox |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edge                                                                                                                                                                                                   | last version                                                                                                                                                                                                  | last version                                                                                                                                                                                                      |

## 运行截图

<p>
	<div style="margin-top:20px">
        <img src="docs\introduction\job-item-51job.jpg" alt="51job" width="1000px"/>
        <div style="text-align:center;">
            前程无忧
        </div>
	</div>
</p>

### 管理页面

<p>
    <div style="margin-top:20px">
        <img src="docs\introduction\chrome_extension_sidepanel_open.png" alt="chrome_extension_sidepanel_open" width="600px"/>
        <div style="text-align:center">
            打开管理页面
        </div>
	</div>
    <div style="margin-top:20px">
        <img src="docs\introduction\sidepanel_admin_home.jpg" alt="sidepanel_admin_home" width="1000px"/>
        <div style="text-align:center">
            管理页面（需点击插件图标打开）
        </div>
	</div>
    <div style="margin-top:20px">
        <img src="docs\introduction\sidepanel_admin_company_tag.jpg" alt="sidepanel_admin_company_tag" width="1000px"/>
        <div style="text-align:center">
            公司标签管理
        </div>
	</div>
    <div style="margin-top:20px">
        <img src="docs\introduction\sidepanel_admin_setting.jpg" alt="sidepanel_admin_setting" width="1000px"/>
        <div style="text-align:center">
            系统设置
        </div>
	</div>
</p>

## 运行及编译

> 以chrome为例（firefox类似）

**直接下载 1（尝鲜版）**

1. 切换到 dist/chrome-dev 分支
2. 点击右边绿色 code 按钮，选择下拉框中的 Download ZIP 下载
3. 解压 zip 文件
4. 打开 chrome，选择加载已解压的扩展程序，选择解压后的 job-hunting-chrome-dev 目录

**直接下载 2**

1. 切换到 dist/chrome-xx.xx.xx 分支
2. 点击右边绿色 code 按钮，选择下拉框中的 Download ZIP 下载
3. 解压 zip 文件
4. 打开 chrome，选择加载已解压的扩展程序，选择解压后的 job-hunting-chrome-xx.xx.xx 目录

**直接下载 3**

1. 打开 Release 页
2. 找到最新版本的 Assets 页下的 job-hunting-chrome-extension-xxx.zip
3. 解压 zip 文件
4. 打开 chrome，选择加载已解压的扩展程序，选择解压后的 job-hunting-chrome-extension 目录

**编译**

1. 安装，编译

```bash
    pnpm i
    pnpm run build-chrome
```

2. 打开 chrome，选择加载已解压的扩展程序，选择当前项目的 dist-chrome 目录

3. 打开页面
   - boss 直聘： <https://www.zhipin.com/web/geek/job>
   - 51Job： <https://we.51job.com/pc/search>
   - 智联招聘： <https://sou.zhaopin.com/>
   - 拉钩网：<https://www.lagou.com/wn/zhaopin>
   - jobsdb-hk：<https://hk.jobsdb.com/>
   - 猎聘网： <https://www.liepin.com/zhaopin>

**开发**

1. 安装，编译

   ```bash
   pnpm i
   pnpm run dev-chrome
   ```

2. chrome 浏览器打开 chrome://extensions/ 页面

3. 点击`加载已解压的扩展程序`

4. 选择项目中生成的 dist-chrome 文件夹即可

5. 每次保存都会重新编译，扩展程序需要**_重新点一次刷新按钮_**才生效

## Thanks

1. https://github.com/tangzhiyao/boss-show-time **_boss 直聘时间展示插件_**
2. https://github.com/iibeibei/tampermonkey_scripts **_BOSS 直聘 跨境黑名单_**
3. https://kjxb.org/ **_【跨境小白网】，跨境电商人的职场交流社区，互助网站。_**
4. https://maimai.cn/article/detail?fid=1662335089&efid=I0IjMo8A_37C2pHoqU2HjA **_求职必备技能：教你如何扒了公司的底裤_**
