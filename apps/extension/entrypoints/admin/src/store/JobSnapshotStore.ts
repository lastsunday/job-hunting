import { ConfigApi } from "@/common/api";
import { CONFIG_KEY_JOB_SNAPSHOT } from "@/common/config";
import { Config } from "@/common/data/domain/config";
import { JobSnapshotConfigDTO } from "@/common/data/dto/jobSnapshotConfigDTO";
import { create } from 'zustand';

interface JobSnapshotState {
    config: JobSnapshotConfigDTO
    init: () => Promise<void>,
    update: (config: JobSnapshotConfigDTO) => Promise<void>,
}

const useJobSnapshotStore = create<JobSnapshotState>()((set) => {
    const _init = async () => {
        const configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_JOB_SNAPSHOT);
        if (configValue && configValue.value) {
            const config = JSON.parse(configValue.value);
            set(() => ({ config: { ...config } }));
        } else {
            set(() => (new JobSnapshotConfigDTO()));
        }
    }

    const _update = async (target: JobSnapshotConfigDTO) => {
        let config = await ConfigApi.getConfigByKey(CONFIG_KEY_JOB_SNAPSHOT);
        if (!config) {
            config = new Config();
            config.key = CONFIG_KEY_JOB_SNAPSHOT;
            config.value = JSON.stringify(target)
        } else {
            config.value = JSON.stringify(Object.assign(JSON.parse(config.value), target));
        }
        await ConfigApi.addOrUpdateConfig(config);
    }

    return {
        config: new JobSnapshotConfigDTO(),
        init: async () => {
            await _init();
        },
        update: async (config: JobSnapshotConfigDTO) => {
            await _update(config);
            set(() => ({ config: { ...config } }));
        }
    }
})

export default useJobSnapshotStore;