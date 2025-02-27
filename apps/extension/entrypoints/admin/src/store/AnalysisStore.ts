import { ConfigApi } from "@/common/api";
import { CONFIG_KEY_ANALYSIS } from "@/common/config";
import { Config } from "@/common/data/domain/config";
import { AnalysisConfigDTO } from "@/common/data/dto/analysisConfigDTO";
import { create } from 'zustand';

interface AnalysisState {
    config: AnalysisConfigDTO
    init: () => Promise<void>,
    update: (config: AnalysisConfigDTO) => Promise<void>,
}

const useAnalysisStore = create<AnalysisState>()((set) => {
    const _init = async () => {
        const configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_ANALYSIS);
        if (configValue && configValue.value) {
            const config = JSON.parse(configValue.value);
            set(() => ({ config: { ...config } }));
        } else {
            set(() => (new AnalysisConfigDTO()));
        }
    }

    const _update = async (target: AnalysisConfigDTO) => {
        let config = await ConfigApi.getConfigByKey(CONFIG_KEY_ANALYSIS);
        if (!config) {
            config = new Config();
            config.key = CONFIG_KEY_ANALYSIS;
            config.value = JSON.stringify(target)
        } else {
            config.value = JSON.stringify(Object.assign(JSON.parse(config.value), target));
        }
        await ConfigApi.addOrUpdateConfig(config);
    }

    return {
        config: new AnalysisConfigDTO(),
        init: async () => {
            await _init();
        },
        update: async (config: AnalysisConfigDTO) => {
            await _update(config);
            set(() => ({ config: { ...config } }));
        }
    }
})

export default useAnalysisStore;