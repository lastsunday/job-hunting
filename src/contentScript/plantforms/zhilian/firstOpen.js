import {
  setupSortJobItem,
} from "../../commonRender";
import { parseZhilianData, getListByNode } from "./index";


// 智联招聘首次打开页面时是服务端渲染，没法监听接口，但是 html 中保存了列表数据
export default async function firstOpen(data) {
  const dom = document.querySelector(".positionlist__list");
  setupSortJobItem(dom);
  const children = dom?.children;
  const { positionList = [] } = data;
  if (!children || !positionList || positionList.length === 0) return;
  parseZhilianData(positionList, getListByNode(dom));
}
