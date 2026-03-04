# 浏览器插件

> [!IMPORTANT]
> 项目根目录: apps/extension

## 编译

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

## 开发

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
