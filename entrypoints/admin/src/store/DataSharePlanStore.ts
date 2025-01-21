import { ConfigApi, DataSharePartnerApi, TaskApi } from "@/common/api";
import { CONFIG_KEY_DATA_SHARE_PLAN, GLOBAL_STATISTIC_LOOP_DELAY } from "@/common/config";
import { StatisticTaskBO } from "@/common/data/bo/statisticTaskBO";
import { Config } from "@/common/data/domain/config";
import { DataSharePlanConfigDTO } from "@/common/data/dto/dataSharePlanConfigDTO";
import dayjs from "dayjs";
import { create } from 'zustand';

interface DataSharePlanState {
    enable: boolean,
    init: () => Promise<void>,
    change: (enable: boolean) => Promise<void>,
    dataSharePartnerCount: number,
    uploadRecordTotalCountToday: number,
    downloadFileTotalCountToday: number,
    mergeRecordTotalCountToday: number,
    uploadRecordTotalCountAll: number,
    downloadFileTotalCountAll: number,
    mergeRecordTotalCountAll: number,
}

const useDataSharePlanStore = create<DataSharePlanState>()((set) => {
    const _init = async () => {
        const configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_DATA_SHARE_PLAN);
        if (configValue && configValue.value) {
            const config = JSON.parse(configValue.value);
            set(() => ({ enable: config.enable }));
        } else {
            set(() => ({ enable: false }));
        }
        statistic();
        setInterval(statistic, GLOBAL_STATISTIC_LOOP_DELAY);
    }

    const statistic = async () => {
        const statisticDataSharePartnerDTO = await DataSharePartnerApi.statisticDataSharePartner({});
        const dataSharePartnerCount = statisticDataSharePartnerDTO.totalCount;
        const now = dayjs();
        const todayStart = now.startOf("day").format();
        const todayEnd = now
            .startOf("day")
            .add(1, "day")
            .format();
        const todayParam = new StatisticTaskBO();
        todayParam.startDatetime = todayStart;
        todayParam.endDatetime = todayEnd;
        const statisticTaskToday = await TaskApi.statisticTask(todayParam);
        const uploadRecordTotalCountToday = statisticTaskToday.uploadRecordTotalCount;
        const downloadFileTotalCountToday = statisticTaskToday.downloadFileTotalCount;
        const mergeRecordTotalCountToday = statisticTaskToday.mergeRecordTotalCount;
        const allParam = new StatisticTaskBO();
        const statisticTaskAll = await TaskApi.statisticTask(allParam);
        const uploadRecordTotalCountAll = statisticTaskAll.uploadRecordTotalCount;
        const downloadFileTotalCountAll = statisticTaskAll.downloadFileTotalCount;
        const mergeRecordTotalCountAll = statisticTaskAll.mergeRecordTotalCount;
        set(() => ({
            dataSharePartnerCount,
            uploadRecordTotalCountToday,
            downloadFileTotalCountToday,
            mergeRecordTotalCountToday,
            uploadRecordTotalCountAll,
            downloadFileTotalCountAll,
            mergeRecordTotalCountAll,
        }));
    }

    const _update = async (target: DataSharePlanConfigDTO) => {
        let config = await ConfigApi.getConfigByKey(CONFIG_KEY_DATA_SHARE_PLAN);
        if (!config) {
            config = new Config();
            config.key = CONFIG_KEY_DATA_SHARE_PLAN;
            config.value = JSON.stringify(target)
        } else {
            config.value = JSON.stringify(Object.assign(JSON.parse(config.value), target));
        }
        await ConfigApi.addOrUpdateConfig(config);
    }

    return {
        enable: false,
        init: async () => {
            await _init();
        },
        change: async (enable: boolean) => {
            const target = new DataSharePlanConfigDTO();
            target.enable = enable;
            await _update(target);
            set(() => ({ enable }));
        },
    }
})

export default useDataSharePlanStore;