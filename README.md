# Job Hunting - 一款协助找工作的 chrome 浏览器插件

<p align="center">
    <img src="docs\logo.png" alt="angular-logo" width="128px" height="128px"/>
</p>

## 功能列表

1. 显示职位发布时间（支持BOSS,51Job,智联,拉钩）
2. 本地显示职位初次浏览时间，历史浏览次数
3. 本地职位记录统计，查询，查询结果导出
4. 数据备份，数据恢复
5. 职位评论（当前采用ECHO作为评论平台，请遵守相关法律法规合法留言）


## 运行及编译

**直接下载**

1. 切换到 gh-pages 分支
2. 点击右边绿色 code 按钮，选择下拉框中的 Download ZIP 下载

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
