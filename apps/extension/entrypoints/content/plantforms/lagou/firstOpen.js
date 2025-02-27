import {
  setupSortJobItem,
  renderSortJobItem,
  createLoadingDOM,
  hiddenLoadingDOM,
  finalRender,
  renderFunctionPanel,
} from "../../commonRender";
import { createDOM } from "./index";
import { mutationContainer, getListValue } from "./index";
import { PLATFORM_LAGOU } from "../../../../common";
import { saveBrowseJob, getJobIds, getAnalysisConfig } from "../../commonDataHandler";
import { JobApi } from "../../../../common/api";

// 首次打开页面时是服务端渲染，没法监听接口，但是 html 中保存了列表数据
export default function firstOpen(data) {
  mutationContainer().then(async (dom) => {
    setupSortJobItem(dom);
    const children = dom?.children;
    const list = getListValue(data?.props?.pageProps?.initData) || [];
    // 这里可以查看具体job list信息
    // console.log(list);
    if (!children || !list || list.lenth === 0) return;
    list.forEach((item, index) => {
      const dom = children?.[index];
      const { companyShortName } = item;
      const loadingLastModifyTimeTag = createLoadingDOM(
        companyShortName,
        "__zhipin_time_tag"
      );
      dom.appendChild(loadingLastModifyTimeTag);
    });
    await saveBrowseJob(list, PLATFORM_LAGOU);
    const jobDTOList = await JobApi.getJobBrowseInfoByIds(
      getJobIds(list, PLATFORM_LAGOU)
    );
    const analysisConfig = await getAnalysisConfig();
    list.forEach((item, index) => {
      const dom = children?.[index];
      if (!dom) return;

      const tag = createDOM(jobDTOList[index], { analysisConfig });
      dom.appendChild(tag);
    });
    hiddenLoadingDOM();
    renderSortJobItem(
      jobDTOList,
      (index) => {
        return children?.[index];
      },
      { platform: PLATFORM_LAGOU }
    );
    await renderFunctionPanel(
      jobDTOList,
      (index) => {
        return children?.[index];
      },
      { platform: PLATFORM_LAGOU }
    );
    finalRender(jobDTOList, { platform: PLATFORM_LAGOU });
  });
}
