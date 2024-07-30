<template>
    <div class="main">
        <div class="wrapper">
            <div class="inner">
                <div class="title">{{ props.title }}</div>
                <div class="row">
                    <div class="col colUrl title">{{ props.columnTitleArray[0] }}</div>
                    <div class="col colView title">{{ props.columnTitleArray[1] }}</div>
                    <div class="col colUnique title">{{ props.columnTitleArray[2] }}</div>
                </div>
                <div class="row" v-for="item in model">
                    <el-link class="col colUrl" type="primary" :href="item.url" target="_blank">{{ item.title
                        }}</el-link>
                    <div class="col colView">{{ item.count }}</div>
                    <div class="col colUnique">{{ item.uniques }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
const props = defineProps(["title", "columnTitleArray"]);

const model = defineModel()

</script>
<style lang="css" scoped>
.main {

    .wrapper {
        padding: 10px;

        .inner {
            border: 1px solid #d0d7de;
            padding: 10px;
            border-radius: 5px;
        }
    }

    .title {
        font-size: 16px;
        font-weight: 600;
    }
}

.row {
    display: flex;

    .title {
        font-size: 14px;
        font-weight: 600;
        border-bottom: 1px solid #d0d7de;
    }
}

.row:nth-child(even) {
    background-color: #f6f8fa;
}

.col {
    padding: 5px;
    text-align: center;
}

.colUrl {
    flex: 1;
}

.colView {
    width: 100px;
}

.colUnique {
    width: 100px;
}
</style>