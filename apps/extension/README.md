# @job-hunting/extension

## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/> Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Edge                                                         | last version                                                 |

## 运行及编译

**编译**

1. 安装，编译

```bash
    pnpm i
    pnpm run build
```

1. 打开 chrome，选择加载已解压的扩展程序，选择当前项目的 .output/chrome-mv3 目录

2. 打开页面
   - boss 直聘： <https://www.zhipin.com/web/geek/jobs>
   - 51Job： <https://we.51job.com/pc/search>
   - 智联招聘： <https://sou.zhaopin.com/>
   - 拉钩网：<https://www.lagou.com/wn/zhaopin>
   - 猎聘网： <https://www.liepin.com/zhaopin>
   - 就业在线： <https://www.jobonline.cn/position>
   - 广东公共求职招聘服务平台 <https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/search?type=1>

**开发**

1. 安装，编译

   ```bash
   pnpm i
   pnpm run dev
   ```

2. chrome 浏览器打开 chrome://extensions/ 页面

3. 点击`加载已解压的扩展程序`

4. 选择项目中生成的 .output/chrome-mv3-dev 文件夹即可

5. 每次保存都会重新编译，扩展程序需要**_重新点一次刷新按钮_**才生效

## 测试

> <https://vitalets.github.io/playwright-bdd/>

## Thanks

1. <https://github.com/tangzhiyao/boss-show-time> **_boss 直聘时间展示插件_**
2. <https://github.com/iibeibei/tampermonkey_scripts> **_BOSS 直聘 跨境黑名单_**
3. <https://kjxb.org/> **_【跨境小白网】，跨境电商人的职场交流社区，互助网站。_**
4. <https://maimai.cn/article/detail?fid=1662335089&efid=I0IjMo8A_37C2pHoqU2HjA> **_求职必备技能：教你如何扒了公司的底裤_**
5. <https://github.com/it-job-blacklist/996ICU.job.blacklist_company> **_主要城市996公司名单，互联网企业黑名单，找工作防止掉坑_**
6. <http://www.blackdir.com> **_IT黑名单_**
7. <https://www.reshot.com> **Free Icons & IllustrationsDesign freely with instant downloads and commercial licenses.**
8. <https://github.com/wxt-dev/wxt> **Next-gen Web Extension Framework**
9. <https://github.com/ant-design/ant-design> **An enterprise-class UI design language and React UI library**
