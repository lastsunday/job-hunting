<template>
    <input ref="inputRef" @change="handleChange" :placeholder="props.placeholder" />
</template>
<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import Tagify from "@yaireo/tagify";
import "@yaireo/tagify/dist/tagify.css";
import DragSort from '@yaireo/dragsort';
import { watch } from "vue";

const model = defineModel()
const props = defineProps(["settings", "whitelist", "placeholder"]);
const emits = defineEmits(["value-change"]);
const inputRef = ref();
let tagify = ref();
let observer = null;

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
    let tagListDiv = tagify.value.DOM.scope;
    //补全逻辑，当删除所有的tag，不会触发originalInputValueFormat去返回空列表，新增监听Tag元素变动时，检测结果是否为空，如果为空则触发数值更新
    observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                if (tagify.value.getInputValue() != undefined) {
                    model.value = [];
                    emits("value-change");
                }
            }
        }
    }
    );
    observer.observe(tagListDiv, {
        childList: true,
        subtree: false,
    });

    tagify.value.loadOriginalValues(props.modelValue);
    if (props.whitelist) {
        tagify.value.whitelist = props.whitelist.value;
    }
    let dragsort = new DragSort(tagify.value.DOM.scope, {
        selector: '.' + tagify.value.settings.classNames.tag,
        callbacks: {
            dragEnd: (elem) => {
                tagify.value.updateValueByDOMTags();
            }
        }
    });
});

onUnmounted(() => {
    observer?.disconnect();
})

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