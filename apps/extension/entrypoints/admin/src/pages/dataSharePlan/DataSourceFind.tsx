import { DEFAULT_DATA_REPO } from "@/common/config";
import { TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD } from "@/common";
import {
  Flex,
} from 'antd';
import { Tabs } from 'antd/lib';
import StandardData from './dataSource/StandardData';
export type DataSourceFindProps = {};
const DataSourceFind: React.FC<DataSourceFindProps> = ({ }) => {

  const genTabContent = () => {
    return <StandardData repo={DEFAULT_DATA_REPO} config={{ taskTypeList: [{ type: TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD }] }}></StandardData>
  }
  const onTabChange = (key: string) => {
    console.log(key);
  }
  return (
    <>
      <Flex vertical>
        <Tabs
          defaultActiveKey='1'
          onChange={onTabChange}
          items={[{
            key: "1",
            label: "私有数据",
          }]}
        >
        </Tabs>
        {genTabContent()}
      </Flex>
    </>
  );
};
export default DataSourceFind;
