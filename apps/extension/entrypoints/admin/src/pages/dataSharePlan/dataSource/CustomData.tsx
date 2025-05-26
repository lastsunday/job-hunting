import { DataSharePartnerApi } from '@/common/api';
import { SearchDataSharePartnerBO } from '@/common/data/bo/searchDataSharePartnerBO';
import { DataSharePartner } from "@/common/data/domain/dataSharePartner";
import { Data, Source, SourceConfig } from "@/common/data/domain/dataSourceMetadata";
import { genSha256 } from "@/common/utils";
import {
  Flex,
  Popover,
  TableColumnsType,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import BasicTable from "../../../components/BasicTable";
import styles from "./CustomData.module.css";
const { Text } = Typography;
import { useTask } from "../../../hooks/task";
const { getDisplayNameByTaskType } = useTask();
export type CustomDataProps = {
  data: Data;
};
const CustomData: React.FC<CustomDataProps> = ({ data }) => {
  const [dataSource, setDataSource] = useState<Source[]>([]);
  const tableRef = useRef(null);
  const [dataSharePartnerMap, setDataSharePartnerMap] = useState<
    Map<string, void>
  >(new Map());
  const [refresh, setRefresh] = useState(false);

  const genId = (item: Source | DataSharePartner) => {
    return genSha256(`${item.username}${item.reponame}`);
  }

  const fetchData = async () => {
    if (data.source) {
      data.source.forEach((item: Source) => {
        item._key = genId(item);
      });
    }
    const searchDataSharePartnerParam = new SearchDataSharePartnerBO();
    searchDataSharePartnerParam.usernameList = data.source.flatMap(
      (item: Source) => item.username
    );
    searchDataSharePartnerParam.orderByColumn = 'updateDatetime';
    searchDataSharePartnerParam.orderBy = 'DESC';
    const partnerResult = await DataSharePartnerApi.searchDataSharePartner(
      searchDataSharePartnerParam
    );
    const partnerResultItems = partnerResult.items;
    const dataSharePartnerMap = new Map();
    for (let i = 0; i < partnerResultItems.length; i++) {
      const item = partnerResultItems[i];
      dataSharePartnerMap.set(genId(item), null);
    }
    setDataSharePartnerMap(dataSharePartnerMap);
    setDataSource(data.source ?? []);
    tableRef.current.refresh();
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [refresh]);

  const genState = (id: string) => {
    if (dataSharePartnerMap.has(id)) {
      return (
        <>
          <Tooltip title="已添加">
            <div
              className={`${styles.partnerExists} i-carbon:partnership w-3.5 h-3.5`}
            />
          </Tooltip>
        </>
      );
    } else {
      return (
        <>
          <Tooltip title="可添加">
            <div
              className={`${styles.partnerAdd} i-basil:add-outline w-3.5h-3.5`}
            />
          </Tooltip>
        </>
      );
    }
  };

  const onCheckboxDisableCheck = (record: Source) => {
    return dataSharePartnerMap.has(genId(record));
  }

  const columns: TableColumnsType<Source> = [
    {
      title: '状态',
      dataIndex: '_key',
      render: (value: string) => <Flex>{genState(value)}</Flex>,
      minWidth: 60,
    },
    {
      title: '名称',
      dataIndex: 'name',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '仓库名',
      dataIndex: 'reponame',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '仓库类型',
      dataIndex: 'repoType',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '数据任务',
      dataIndex: "config",
      render: (value: SourceConfig) => {
        return value.taskTypeList.map(item =>
          <Popover
            content={<Flex vertical>
              <Tag className={styles.tag} color="#108ee9">
                {getDisplayNameByTaskType(item.type)}
              </Tag>
              {item.description ? <Text>{item.description}</Text> : null}
            </Flex>}
            trigger="hover"
          >
            <Tag className={styles.tag} color={item.name ? "#f50" : "#108ee9"}>
              {item.name ? item.name : getDisplayNameByTaskType(item.type)}
            </Tag>
          </Popover>
        )
      },
      minWidth: 150,
    },
  ];

  const onAppend = async (selectedRow: Source) => {
    const entityList = [];
    for (let i = 0; i < selectedRow.length; i++) {
      const item = selectedRow[i];
      const entity = new DataSharePartner();
      entity.username = item.username;
      entity.reponame = item.reponame;
      entity.repoType = item.repoType;
      entity.config = item.config;
      entity.enable = true;
      entityList.push(entity);
    }
    await DataSharePartnerApi.dataSharePartnerBatchAddOrUpdate(entityList);
    setRefresh(!refresh);
  }

  return (
    <>
      <BasicTable
        ref={tableRef}
        mode={["a"]}
        onAppend={onAppend}
        searchProps={{
          columns,
          search: async (searchParam) => {
            const start = (searchParam.pageNum - 1) * searchParam.pageSize;
            const end = Math.min(searchParam.pageNum * searchParam.pageSize, dataSource.length);
            return {
              items: dataSource.slice(start, end),
              total: dataSource.length
            };
          },
        }}
        rowKeyFunction={(record) => { return record }}
        onCheckboxDisableCheck={onCheckboxDisableCheck}
      ></BasicTable>
    </>
  );
};
export default CustomData;
