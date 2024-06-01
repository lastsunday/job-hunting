# Job Hunting - 一款协助找工作的 chrome 浏览器插件

<p align="center">
    <img src="docs\logo.png" alt="logo" width="128px" height="128px"/>
</p>

## 招聘平台支持列表

| 招聘平台  | 访问地址                            | 备注                   |
| --------- | ----------------------------------- | ---------------------- |
| BOSS直聘  | https://www.zhipin.com/web/geek/job |                        |
| 前程无忧  | https://we.51job.com/pc/search      |                        |
| 智联招聘  | https://sou.zhaopin.com/            |                        |
| 拉钩网    | https://www.lagou.com/wn/zhaopin    |                        |
| jobsdb-hk | https://hk.jobsdb.com/              | 需点击搜索按钮才有效果 |

## 功能列表

1. 显示职位发布时间与自动排序(按职位发布时间,hr活跃时间（只支持BOSS）)。
2. 快捷查询公司信息🔎。
3. 本地显示职位初次浏览时间，历史浏览次数。
4. 本地职位记录统计，查询，查询结果导出。
5. 数据备份，数据恢复。
6. 职位评论，公司评论。（当前采用ECHO作为评论平台，请遵守相关法律法规合法留言）
7. 数据统计图表
    1. 根据指定搜索条件统计薪酬区间职位数（薪酬计算方式：(最低薪资+最高薪资)/2）


## Browsers support

Modern browsers

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](https://godban.github.io/browsers-support-badges/)</br> Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](https://godban.github.io/browsers-support-badges/)</br>Chrome |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Edge                                                         | last 2 versions                                              |

## 运行截图

<p>
    <div style="margin-top:20px">
        <img src="docs\introduction\job-item-boss.png" alt="boss" width="1000px"/>
        <div style="text-align:center">
            Boss直聘
        </div>
	</div>
	<div style="margin-top:20px">
        <img src="docs\introduction\job-item-51job.png" alt="51job" width="1000px"/>
        <div style="text-align:center;">
            前程无忧
        </div>
	</div>
	<div style="margin-top:20px">
        <img src="docs\introduction\job-item-zhilian.png" alt="zhilian" width="1000px"/>
        <div style="text-align:center">
            智联招聘
        </div>
	</div>
	<div style="margin-top:20px">
        <img src="docs\introduction\job-item-lagou.png" alt="lagou" width="1000px"/>
        <div style="text-align:center">
            拉勾网
        </div>
	</div>
	<div style="margin-top:20px;text-align:center;" >
        <img src="docs\introduction\job-item-jobsdb.png" alt="jobsdb" width="500px"/>
        <div style="text-align:center">
            JobsDB HK
        </div>
	</div>
</p>

### 管理页面

<p>
    <div style="margin-top:20px">
        <img src="docs\introduction\chrome_extension_sidepanel_open.png" alt="chrome_extension_sidepanel_open" width="600px"/>
        <div style="text-align:center">
            打开SidePanel
        </div>
	</div>
    <div style="margin-top:20px">
        <img src="docs\introduction\sidepanel_admin_home.png" alt="sidepanel_admin_home" width="1000px"/>
        <div style="text-align:center">
            管理页面（需点击插件图标打开Sidepanel）
        </div>
	</div>
    <div style="margin-top:20px">
        <img src="docs\introduction\sidepanel_admin_charts_avg_salary.png" alt="sidepanel_admin_charts_avg_salary" width="1000px"/>
        <div style="text-align:center">
            根据指定搜索条件统计薪酬区间职位数
        </div>
	</div>
</p>



## 运行及编译

**直接下载1（尝鲜版）**

1. 切换到 gh-pages 分支
2. 点击右边绿色 code 按钮，选择下拉框中的 Download ZIP 下载
3. 解压zip文件
4. 打开chrome，选择加载已解压的扩展程序，选择解压后的job-hunting-gh-pages目录

**直接下载2**

	1. 打开Release页
 	2. 找到最新版本的Assets页下的job-hunting-chrome-extension-xxx.zip
 	3. 解压zip文件
 	4. 打开chrome，选择加载已解压的扩展程序，选择解压后的job-hunting-chrome-extension目录

**编译**

1. 安装，编译

```bash
    npm i
    npm run build
```

2. 打开chrome，选择加载已解压的扩展程序，选择当前项目的 build 目录

3. 打开页面
    * boss直聘： <https://www.zhipin.com/web/geek/job>
    * 51Job：   <https://we.51job.com/pc/search>
    * 智联招聘： <https://sou.zhaopin.com/>
    * 拉钩网：<https://www.lagou.com/wn/zhaopin>
    * jobsdb-hk <https://hk.jobsdb.com/>

**开发**

1. 安装，编译

   ```bash
   npm i
   npm run watch
   ```

2. chrome 浏览器打开 chrome://extensions/ 页面

3. 点击`加载已解压的扩展程序`

4. 选择项目中生成的 build 文件夹即可

5. 每次保存都会重新编译，扩展程序需要***重新点一次刷新按钮***才生效

## Thanks

1. https://github.com/tangzhiyao/boss-show-time
