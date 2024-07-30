<template>
    <div class="traffic">
        <div class="title">{{ title }}</div>
        <el-row :span="24">
            <v-chart :loading="trafficLoading" class="trafficChart" autoresize :option="trafficOption" />
        </el-row>
        <el-row class="trafficTotal">
            <el-col :span="12">
                {{ trafficCount }} {{ props.firstYAxisTitle }}
            </el-col>
            <el-col :span="12">
                {{ trafficUniques }} {{ props.secondYAxisTitle }}
            </el-col>
        </el-row>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import dayjs from "dayjs";

use([
    CanvasRenderer,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    LineChart,
]);

const props = defineProps(["title", "firstYAxisTitle", "secondYAxisTitle"]);

const title = ref();

const trafficLoading = ref(false);
const trafficCount = ref(0);
const trafficUniques = ref(0);

const trafficOption = ref({
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'cross'
        }
    },
    legend: {},
    xAxis: {
        type: "category",
        data: [],
    },
    yAxis: [{
        type: "value",
        name: "",
        axisLabel: {
            show: true,
            interval: 'auto',
            formatter: '{value} '
        },
        splitLine: {
            show: true,
            lineStyle: {
                type: 'dashed'
            }
        },
        min: 0,
        max: null,
    }, {
        type: "value",
        name: "",
        axisLabel: {
            show: true,
            interval: 'auto',
            formatter: '{value} '
        },
        splitLine: {
            show: true,
            lineStyle: {
                type: 'dashed'
            }
        },
        splitArea: {
            show: false
        },
        min: 0,
        max: null,
    }],
    series: [
        {
            name: "Clones",
            data: [],
            type: "line",
            label: {
                show: true,
            },
        },
        {
            name: "Unique cloners",
            data: [],
            type: "line",
            label: {
                show: true,
            },
        },
    ],
});

const model = defineModel()

onMounted(() => {
    title.value = props.title;
    trafficOption.value.yAxis[0].name = props.firstYAxisTitle;
    trafficOption.value.yAxis[1].name = props.secondYAxisTitle;
    trafficOption.value.series[0].name = props.firstYAxisTitle;
    trafficOption.value.series[1].name = props.secondYAxisTitle;
    renderTraffic();
});

watch(model, async (newValue, oldValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        renderTraffic();
    }
}
)

const renderTraffic = async () => {
    trafficLoading.value = true;
    let modelValue = model.value;
    if (modelValue) {
        trafficOption.value.xAxis.data = modelValue.items.flatMap(item => dayjs(item.timestamp).format("YYYY-MM-DD"));
        trafficOption.value.series[0].data = modelValue.items.flatMap(item => item.count);
        trafficOption.value.series[1].data = modelValue.items.flatMap(item => item.uniques);
        trafficOption.value.yAxis[0].max = Math.max(...trafficOption.value.series[0].data);
        trafficOption.value.yAxis[1].max = Math.max(...trafficOption.value.series[1].data);
        trafficCount.value = modelValue.count;
        trafficUniques.value = modelValue.uniques;
        trafficLoading.value = false;
    }
}

</script>
<style lang="css" scoped>
.trafficChart {
    height: 300px;
}

.traffic {
    border: 1px solid #d0d7de;
    padding: 10px;
    border-radius: 5px;

    .title {
        font-size: 16px;
        font-weight: 600;
    }
}

.trafficTotal {
    border-top: 1px solid #d0d7de;
    padding-top: 10px;
}
</style>