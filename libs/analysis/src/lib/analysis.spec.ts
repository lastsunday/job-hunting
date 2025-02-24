import { page } from '@vitest/browser/context'
import './analysis.js';

const url = "http://localhost:11434";
const model = "deepseek-r1:7b";
const demand = `岗位职责：\n1、负责所在地的网络设备常规巡检。\n2、负责所在地的网路设备的应急报修、故障排除、备件更换。\n3、负责职场呼叫系统前端维护、需求收集。\n4、计算机相关设备维护。\n5、其它临时紧急任务处理。\n\n任职要求：\n1、较强的学习能力及强烈的责任心、有上进心。\n2、性格外向、温和、仪容整洁。\n3、熟悉Cisco、Brocade、H3C等主流网络厂商产品技术及产品架构；\n4、熟悉Linux操作系统的管理及常用工具的使用\n5、有思科华为网络产品的技术支持经验优先。\n7.大专以上学历，可以接受民本学历\n8. 2年以上IT桌面维护或技术支持经验\n9.精通台式电脑、笔记本电脑故障诊断\n10.精通Windows操作系统及常用办公软件`;
const resume = `## 个人信息\n- 学历：本科\n- 工作经验：1年\n\n## 个人情况\n- 了解 Python、Linux/Shell  \n- 了解 Docker 的基本使用，能看懂 Dockerfile 文件  \n- 了解 网络、安全, MySQL   \n- 熟练运用 AI 工具与搜索引擎，提升工作效率  \n- 没有驾照  \n\n## 工作经验\n**阳光雨露信息技术服务（北京）有限公司**  2023.10-2024.11  \n**职位**：桌面运维工程师\n\n通过服务台系统处理用户提交的故障申报\n\n- AD域密码重置、账户解锁\n- 解决软件错误、蓝屏、系统空间不足等问题；重新安装或修复软件。\n- 配置打印机、扫描仪、投影仪等设备，解决连接或驱动问题。\n- 显示器、键盘鼠标等外设损坏；处理硬件故障（如硬盘损坏、内存更换）。为资产管理部门给员工更换设备给出依据\n\n与资产管理部门配合\n\n- 为离职员工/入库电脑进行低级格式化\n- 出库前，为新电脑/格式化后的电脑安装标准化镜像\n- 维护FAQ文档、记录常见问题解决方案\n\n\n## 补充经历`;

describe('analysis', () => {
  beforeEach(() => {
    const element = document.createElement('job-analysis-element');
    element.url = url;
    element.model = model;
    element.demand = demand;
    element.resume = resume;
    document.body.appendChild(element);
  })

  it('should display element', async () => {
    await expect.poll(() => {
      try {
        return page.getByText('职位分析中').element();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        return page.getByText('匹配度').element();
      }
    }, { timeout: 90000 }).toBeVisible();
    await expect.poll(() => page.getByText('匹配度').element(), { timeout: 90000 }).toBeVisible();
  })
});
