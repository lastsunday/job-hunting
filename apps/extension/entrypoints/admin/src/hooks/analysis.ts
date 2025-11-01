export enum Source {
  EXTENSION = 'EXTENSION',
  OPENAI = 'OPENAI',
  OLLAMA = 'OLLAMA',
  SILICONFLOW = 'SILICONFLOW',
}

export enum Page {
  /**
   * 搜索页
   */
  CONTENT_SEARCH = 'CONTENT_SEARCH',
  /**
   * 职位偏好
   */
  ADMIN_FAVORITE = 'ADMIN_FAVORITE',
  /**
   * 浏览历史
   */
  ADMIN_HISTORY = 'ADMIN_HISTORY',
}

import { ConfigApi } from "@/common/api";
import { CONFIG_KEY_ANALYSIS } from "@/common/config";
import { AnalysisConfigDTO } from "@/common/data/dto/analysisConfigDTO";

export function useAnalysis() {

  const getLabelBySource = (source: Source | string) => {
    switch (source) {
      case Source.OLLAMA:
        return `OLLAMA`;
      case Source.OPENAI:
        return `OpenAI兼容协议`;
      case Source.SILICONFLOW:
        return `Siliconflow(硅基流动)`;
      case Source.EXTENSION:
        return `内置`;
      default:
        throw `unknow source ${source}`;
    }
  };

  const getLableByPage = (page: Page | string) => {
    switch (page) {
      case Page.CONTENT_SEARCH:
        return `职位搜索页`;
      case Page.ADMIN_FAVORITE:
        return `职位偏好页`;
      case Page.ADMIN_HISTORY:
        return `浏览历史页`;
      default:
        throw `unknow source ${page}`;
    }
  }

  const queryAnalysisConfig = async () => {
    const configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_ANALYSIS);
    if (configValue && configValue.value) {
      const config = JSON.parse(configValue.value);
      return Object.assign(new AnalysisConfigDTO(), config);
    } else {
      return new AnalysisConfigDTO();
    }
  }

  return { getLabelBySource, getLableByPage, queryAnalysisConfig };
}
