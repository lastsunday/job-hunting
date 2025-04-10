import { CONFIG_KEY_JOB_SNAPSHOT } from "@/common/config";
import { JobSnapshotConfigDTO } from "@/common/data/dto/jobSnapshotConfigDTO";
import { ConfigApi } from "@/common/api";

export default function useConfig() {

    const getJobSnapshotConfig = async () => {
        const configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_JOB_SNAPSHOT);
        if (configValue && configValue.value) {
            const config = JSON.parse(configValue.value);
            return Object.assign(new JobSnapshotConfigDTO(), config);
        } else {
            return new JobSnapshotConfigDTO();
        }
    }

    return { getJobSnapshotConfig }
}