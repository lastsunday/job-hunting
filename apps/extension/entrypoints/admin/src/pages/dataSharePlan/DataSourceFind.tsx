import { DEFAULT_DATA_REPO, DEFAULT_PUBLIC_DATA_REPO } from "@/common/config";
import { TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD, TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD } from "@/common";
import {
  Flex,
} from 'antd';
import { Tabs } from 'antd/lib';
import StandardData from './dataSource/StandardData';
import "./DataSourceFind.css";
export type DataSourceFindProps = {};
const DataSourceFind: React.FC<DataSourceFindProps> = ({ }) => {

  const [tabKey, setTabKey] = useState(TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD);

  const genTabContent = () => {
    if (tabKey == TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD) {
      return <StandardData key={TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD} repo={DEFAULT_DATA_REPO} config={{ taskTypeList: [{ type: TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD }] }}></StandardData>
    } else if (tabKey == TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD) {
      return <StandardData key={TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD} repo={DEFAULT_PUBLIC_DATA_REPO} config={{ taskTypeList: [{ type: TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD }] }}></StandardData>
    } else {
      throw `unknow source type = ${tabKey}`;
    }
  }

  const onTabChange = (key: string) => {
    setTabKey(key);
  }

  return (
    <>
      <Flex vertical>
        <Tabs
          defaultActiveKey={tabKey}
          onChange={onTabChange}
          items={[
            {
              icon: <div className="i-material-symbols:public tab-icon"></div>,
              key: TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD,
              label: "公开数据",
            },
            {
              icon: <div className="i-material-symbols:private-connectivity tab-icon"></div>,
              key: TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD,
              label: "私有数据",
            },
          ]}
        >
        </Tabs>
        {genTabContent()}
      </Flex>
    </>
  );
};
export default DataSourceFind;
