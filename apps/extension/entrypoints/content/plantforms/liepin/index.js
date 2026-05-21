import { PLATFORM_LIEPIN } from '../../../../common';
import {
  saveBrowseJob,
  getJobIds,
  getAnalysisConfig,
} from '../../commonDataHandler';
import { JobApi } from '../../../../common/api';
import {
  renderTimeTag,
  setupSortJobItem,
  renderSortJobItem,
  createLoadingDOM,
  hiddenLoadingDOM,
  finalRender,
  renderFunctionPanel,
} from '../../commonRender';
import dayjs from 'dayjs';

export function getLiepinData(responseText) {
  try {
    const data = JSON.parse(responseText);
    mutationContainer().then((node) => {
      setupSortJobItem(node);
      parseData(data?.data?.data?.jobCardList || [], getListByNode(node));
    });
  } catch (err) {
    console.error('解析 JSON 失败', err);
  }
}

// 获取职位列表节点
function getListByNode(node) {
  const children = node?.children;
  return function getListItem(index) {
    return children?.[index];
  };
}

// 监听节点，判断职位列表是否被挂载
function mutationContainer() {
  return new Promise((resolve, reject) => {
    const dom = document.querySelector('.content-left-section');
    let targetDeom = null;
    const observer = new MutationObserver(function (childList, obs) {
      const isAdd = (childList || []).some((item) => {
        const nodes = item?.addedNodes;
        if (nodes) {
          for (let i = 0; i < nodes.length; i++) {
            const nodeItem = nodes[i];
            if (nodeItem.className == 'job-list-box') {
              targetDeom = nodeItem;
              return nodeItem;
            }
          }
          return false;
        } else {
          return false;
        }
      });
      return isAdd ? resolve(targetDeom) : reject('未找到职位列表');
    });

    observer.observe(dom, {
      childList: true,
      subtree: false,
    });
  });
}

// 解析数据，插入时间标签
async function parseData(list, getListItem) {
  const urlList = [];
  list.forEach((item, index) => {
    const dom = getListItem(index);
    const { link } = item.job;
    //apiUrl
    urlList.push(link);

    dom.classList.add('__LIEPIN_job_item');
    //某些职位不知什么原因不显示，现在把其显示出来
    const jobCard = dom.querySelector('.job-card-pc-container');
    if (jobCard.style.display == 'none') {
      jobCard.style.display = 'flex';
    }
    const { compName } = item.comp;
    const loadingLastModifyTimeTag = createLoadingDOM(
      compName,
      '__liepin_time_tag'
    );
    dom.appendChild(loadingLastModifyTimeTag);
  });
  await saveBrowseJob(list, PLATFORM_LIEPIN);
  const jobDTOList = await JobApi.getJobBrowseInfoByIds(
    getJobIds(list, PLATFORM_LIEPIN)
  );
  const analysisConfig = await getAnalysisConfig();
  list.forEach((item, index) => {
    const { compId } = item.comp;
    let dto = jobDTOList[index];
    dto.jobCompanyApiUrl = `https://www.liepin.com/company/${compId}`;
    const dom = getListItem(index);
    const tag = createDOM(dto, {
      analysisConfig,
      getFullJobInfoCallback: async () => {
        let jobDTOList = await JobApi.getJobBrowseInfoByIds(
          getJobIds([item], PLATFORM_LIEPIN)
        );
        const dto = jobDTOList[0];
        const jobResponse = await fetch(dto.jobUrl);
        const jobResult = await jobResponse.text();
        let jobDescription = null;
        const jobDescFilterTextList = jobResult.match(
          /<dd data-selector="job-intro-content">[\s\S]*?<\/dd>/g
        );
        if (jobDescFilterTextList && jobDescFilterTextList.length > 0) {
          const jobDescGroups = jobDescFilterTextList[0].match(
            /<dd data-selector="job-intro-content">(?<data>[\s\S]*)<\/dd>/
          )?.groups;
          if (jobDescGroups) {
            jobDescription = jobDescGroups['data'];
          }
        }
        dto.jobDescription = jobDescription;
        dto.updateDatetime = dayjs();

        if (item.comp.link && item.comp.link.length > 0) {
          const response = await fetch(item.comp.link);
          const result = await response.text();
          //eg: ["企业全称</span></p><pclass=\"text\">长沙裕邦软件开发有限公司</p>"]
          const firstFilterTextList = result
            .replaceAll('\n', '')
            .replaceAll(' ', '')
            .match(/企业全称<\/span><\/p>.*?\/p>/g);
          if (firstFilterTextList && firstFilterTextList.length > 0) {
            const groups =
              firstFilterTextList[0].match(/">(?<data>.*)<\/p>/)?.groups;
            if (groups) {
              dto.jobCompanyName = groups['data'];
              dto.isFullCompanyName = true;
            }
          }
        }
        await JobApi.batchAddOrUpdateJob([dto]);
        jobDTOList = await JobApi.getJobBrowseInfoByIds(
          [dto.jobId],
          PLATFORM_LIEPIN
        );
        return jobDTOList[0];
      },
    });
    dom.appendChild(tag);
  });
  hiddenLoadingDOM();
  renderSortJobItem(jobDTOList, getListItem, { platform: PLATFORM_LIEPIN });
  await renderFunctionPanel(jobDTOList, getListItem, {
    platform: PLATFORM_LIEPIN,
    getCompanyInfoFunction: async function (url, { item }) {
      let jobDTOList = await JobApi.getJobBrowseInfoByIds(
        [item.jobId],
        PLATFORM_LIEPIN
      );
      const dto = jobDTOList[0];
      const jobResponse = await fetch(dto.jobUrl);
      const jobResult = await jobResponse.text();
      let jobDescription = null;
      const jobDescFilterTextList = jobResult.match(
        /<dd data-selector="job-intro-content">[\s\S]*?<\/dd>/g
      );
      if (jobDescFilterTextList && jobDescFilterTextList.length > 0) {
        const jobDescGroups = jobDescFilterTextList[0].match(
          /<dd data-selector="job-intro-content">(?<data>[\s\S]*)<\/dd>/
        )?.groups;
        if (jobDescGroups) {
          jobDescription = jobDescGroups['data'];
        }
      }
      dto.jobDescription = jobDescription;
      dto.updateDatetime = dayjs();
      if (url && url > 0) {
        const response = await fetch(url);
        const result = await response.text();
        //eg: ["企业全称</span></p><pclass=\"text\">长沙裕邦软件开发有限公司</p>"]
        const firstFilterTextList = result
          .replaceAll('\n', '')
          .replaceAll(' ', '')
          .match(/企业全称<\/span><\/p>.*?\/p>/g);
        if (firstFilterTextList && firstFilterTextList.length > 0) {
          const groups =
            firstFilterTextList[0].match(/">(?<data>.*)<\/p>/)?.groups;
          if (groups) {
            dto.jobCompanyName = groups['data'];
            dto.isFullCompanyName = true;
          }
        }
      }
      await JobApi.batchAddOrUpdateJob([dto]);
      jobDTOList = await JobApi.getJobBrowseInfoByIds([dto.jobId]);
      return {
        companyName: jobDTOList[0].jobCompanyName,
        jobDescription: jobDTOList[0].jobDescription,
      };
    },
  });
  finalRender(jobDTOList, { platform: PLATFORM_LIEPIN });
}

export function createDOM(jobDTO, { analysisConfig, getFullJobInfoCallback }) {
  const div = document.createElement('div');
  div.classList.add('__liepin_time_tag');
  renderTimeTag(div, jobDTO, {
    platform: PLATFORM_LIEPIN,
    analysisConfig,
    getFullJobInfoCallback,
  });
  return div;
}
