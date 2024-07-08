<template>
    <input ref="inputRef" @change="handleChange" :placeholder="props.placeholder" />
</template>
<script setup>
import { onMounted, ref } from "vue";
import Tagify from "@yaireo/tagify";
import "@yaireo/tagify/dist/tagify.css";
import { watch } from "vue";

const model = defineModel()
const props = defineProps(["settings", "whitelist", "placeholder"]);
const emits = defineEmits(["value-change"]);
const inputRef = ref();
let tagify = ref();

defineExpose({
    clear() {
        model.value = [];
        tagify.value.removeAllTags();
        emits("value-change");
    }
});

function handleChange(e) {
    let str = e.target.value;
    if (!str) {
        model.value = [];
        emits("value-change");
    };
}

watch(props.whitelist, async (newValue, oldValue) => {
    tagify.value.whitelist = newValue;
}
)

watch(model, async (newValue, oldValue) => {
    //TODO 更新model的值，会连续触发三次，需要找出原因
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        tagify.value.loadOriginalValues(newValue);
    }
}
)

onMounted(() => {
    let settings = props.settings ?? {};
    settings.originalInputValueFormat = (valuesArr) => {
        model.value = valuesArr;
        emits("value-change");
    };
    tagify.value = new Tagify(inputRef.value, settings);
    tagify.value.loadOriginalValues(props.modelValue);
    tagify.value.whitelist = props.whitelist.value;
});

</script>
<style lang="css">
.tagify {
    flex: 1;
}

.tags-look .tagify__dropdown__item {
    display: inline-block;
    vertical-align: middle;
    border-radius: 3px;
    padding: .3em .5em;
    border: 1px solid #CCC;
    background: #F3F3F3;
    margin: .2em;
    /* font-size: .85em; */
    color: black;
    transition: 0s;
}

.tags-look .tagify__dropdown__item--active {
    border-color: black;
}

.tags-look .tagify__dropdown__item:hover {
    background: lightyellow;
    border-color: gold;
}

.tags-look .tagify__dropdown__item--hidden {
    max-width: 0;
    max-height: initial;
    padding: .3em 0;
    margin: .2em 0;
    white-space: nowrap;
    text-indent: -20px;
    border: 0;
}
</style>