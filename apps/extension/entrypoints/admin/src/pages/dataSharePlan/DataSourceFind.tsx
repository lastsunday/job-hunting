import { DataSourceMetadataApi } from "@/common/api";
import { DataSourceMetadataSearchBO } from "@/common/data/bo/dataSourceMetadataSearchBO";
import { TYPE_GITHUB_GRAPHQL_SEARCH_REPO, TYPE_GIT_METADATA } from "@/common/data/domain/dataSourceMetadata";
import { warnLog } from "@/common/log";
import {
  Flex,
  Typography,
} from 'antd';
import { Popover, Tabs } from 'antd/lib';
import CustomData from "./dataSource/CustomData";
import StandardData from './dataSource/StandardData';
import "./DataSourceFind.css";
import styles from "./DataSourceFind.module.css";
const { Text } = Typography;
export type DataSourceFindProps = {
  onAddCallback?: () => void
};
const DataSourceFind: React.FC<DataSourceFindProps> = ({ onAddCallback }) => {

  const [tabKey, setTabKey] = useState<string>();

  const [dataSourceMetadata, setDataSourceMeta] = useState([]);
  const [idDataSourceMetadataMap, setIdDataSourceMetadataMap] = useState(new Map());

  const genTabContent = () => {
    const id = tabKey;
    if (id) {
      if (idDataSourceMetadataMap.has(id)) {
        const item = idDataSourceMetadataMap.get(id);
        if (item.type == TYPE_GITHUB_GRAPHQL_SEARCH_REPO) {
          const config = item.config;
          return <StandardData onAddCallback={onAddCallback} key={id} repo={config.repoName} config={config.config}></StandardData>
        } else {
          return <CustomData onAddCallback={onAddCallback} key={id} data={item.data}></CustomData>
        }
      } else {
        throw `unknow data source metadata id = ${id}`;
      }
    } else {
      return null;
    }
  }

  const onTabChange = (key: string) => {
    if (key) {
      setTabKey(key);
    }
  }

  const queryDataSourceMetadata = async () => {
    const param = new DataSourceMetadataSearchBO();
    param.enable = true;
    param.orderByColumn = "seq";
    param.orderBy = "ASC";
    const result = await DataSourceMetadataApi.dataSourceMetadataSearch(param);
    setDataSourceMeta(result.items);
    setIdDataSourceMetadataMap(new Map(result.items.map(item => [item.id, item])));
    if (result.items.length > 0) {
      setTabKey(result.items[0].id);
    }
  }

  useEffect(() => {
    queryDataSourceMetadata();
  }, []);

  const genItems = () => {
    let result = [];
    if (dataSourceMetadata.length > 0) {
      for (let i = 0; i < dataSourceMetadata.length; i++) {
        const item = dataSourceMetadata[i];
        if (item.type == TYPE_GITHUB_GRAPHQL_SEARCH_REPO) {
          result.push(
            {
              icon: <div className={styles.icon} style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(item.icon)}")` }}></div>,
              key: item.id,
              label:
                <Popover
                  content={<Text>{item.name}</Text>}
                  trigger="hover"
                >
                  <Text
                    title={`${item.name}`}
                    ellipsis
                  >{item.name}</Text>
                </Popover>,
            }
          );
        } else if (item.type == TYPE_GIT_METADATA) {
          result.push(
            {
              icon: <div className={styles.icon} style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(item.icon)}")` }}></div>,
              key: item.id,
              label:
                <Popover
                  content={<Text>{item.name}</Text>}
                  trigger="hover"
                >
                  <Text
                    title={`${item.name}`}
                    ellipsis
                  >{item.name}</Text>
                </Popover>,
            }
          );
        } else {
          //skip
          warnLog(`unknow metadata type =${item.type}`);
        }
      }
    }
    return result;
  }

  return (
    <>
      <Flex vertical>
        <Tabs
          onChange={onTabChange}
          items={genItems()}
        >
        </Tabs>
        <div key={tabKey}>
          {genTabContent()}
        </div>
      </Flex>
    </>
  );
};
export default DataSourceFind;
