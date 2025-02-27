export enum Source {
    OLLAMA = 'OLLAMA',
    SILICONFLOW = 'SILICONFLOW',
}

export enum Page {
    /**
     * 搜索页
     */
    CONTENT_SEARCH = 'CONTENT_SEARCH',
}

export function useAnalysis() {

    const getLabelBySource = (source: Source | string) => {
        switch (source) {
            case Source.OLLAMA:
                return `OLLAMA`;
            case Source.SILICONFLOW:
                return `Siliconflow(硅基流动)`;
            default:
                throw `unknow source ${source}`;
        }
    };

    const getLableByPage = (page: Page | string) => {
        switch (page) {
            case Page.CONTENT_SEARCH:
                return `搜索页`;
            default:
                throw `unknow source ${page}`;
        }
    }

    return { getLabelBySource, getLableByPage };
}