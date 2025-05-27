
import { DataSharePartnerApi } from '@/common/api';
import { GithubApi } from '@/common/api/github';
import {
  COMMENT_PAGE_SIZE,
  DEFAULT_REPO_TYPE
} from '@/common/config';
import { SearchDataSharePartnerBO } from '@/common/data/bo/searchDataSharePartnerBO';
import { Config, DataSharePartner } from '@/common/data/domain/dataSharePartner';
import { useTask } from "@/common/hooks/task";
import { dateToStr } from '@/common/utils';
import {
  Avatar,
  Button,
  Flex,
  Pagination,
  Space,
  Spin,
  Table,
  TableColumnsType,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { Tag } from 'antd/lib';
import { TableRowSelection } from 'antd/lib/table/interface';
import dayjs from 'dayjs';
import { useShallow } from 'zustand/shallow';
import { PageInfo } from '../../../data/PageInfo';
import { Owner, RepositoryData } from '../../../data/RepositoryData';
import { useTask as useTaskInner } from "../../../hooks/task";
import useAuthStore from '../../../store/AuthStore';
import styles from './StandardData.module.css';
const { Text } = Typography;
export type StandardDataProps = {
  repo: string;
  config: Config;
  onAddCallback?: () => void;
};
const StandardData: React.FC<StandardDataProps> = ({ repo, config, onAddCallback }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<RepositoryData[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [searchParam, setSearchParam] = useState({
    first: COMMENT_PAGE_SIZE,
    after: null,
    last: null,
    before: null,
    repo,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [idObjectMap, setIdObjectMap] = useState<Map<string, RepositoryData>>(
    new Map()
  );
  const [dataSharePartnerMap, setDataSharePartnerMap] = useState<
    Map<string, void>
  >(new Map());
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(COMMENT_PAGE_SIZE);
  const [pageInfo, setPageInfo] = useState<PageInfo>();
  const topRef = useRef(null);
  const [addLoading, setAddLoading] = useState(false);
  const [auth, username] = useAuthStore(useShallow((state) => [state.auth, state.username]));
  const [messageApi, contextHolder] = message.useMessage();

  const { getTaskTypeListFromDataSharePartnerConfig } = useTask();
  const { getDisplayNameByTaskType } = useTaskInner();
  let _loading = false;
  const genState = (id: string) => {
    if (!idObjectMap.has(id)) {
      return null;
    }
    const item = idObjectMap.get(id);
    if (item.owner.login == username) {
      return (
        <>
          <Tooltip title="不能添加自己">
            <div className="i-icon-park-outline:invalid-files w-3.5 h-3.5" />
          </Tooltip>
        </>
      );
    } else if (item.name != repo) {
      return (
        <>
          <Tooltip title="仓库名不符合条件">
            <div className="i-icon-park-outline:invalid-files w-3.5 h-3.5" />
          </Tooltip>
        </>
      );
    } else {
      if (dataSharePartnerMap.has(`${item.owner.login}${repo}`)) {
        return (
          <>
            <Tooltip title="已添加到伙伴列表">
              <div
                className={`${styles.partnerExists} i-carbon:partnership w-3.5 h-3.5`}
              />
            </Tooltip>
          </>
        );
      } else {
        return (
          <>
            <Tooltip title="可添加到伙伴列表">
              <div
                className={`${styles.partnerAdd} i-basil:add-outline w-3.5 h-3.5`}
              />
            </Tooltip>
          </>
        );
      }
    }
  };

  const columns: TableColumnsType<RepositoryData> = [
    {
      title: '状态',
      dataIndex: 'id',
      render: (value: string) => <Flex>{genState(value)}</Flex>,
      minWidth: 60,
    },
    {
      title: '头像',
      dataIndex: 'owner',
      render: (value: Owner) => <Avatar src={value.avatarUrl} />,
      minWidth: 70,
    },
    {
      title: '用户名',
      dataIndex: 'owner',
      render: (value: Owner) => <Text>{value.login}</Text>,
      minWidth: 160,
    },
    {
      title: '仓库名',
      dataIndex: 'name',
      render: (value: string) => <Text>{value}</Text>,
    },
    {
      title: <div className={styles.headerTitle}>星数<div className='i-fluent-emoji-flat:star'></div></div>,
      dataIndex: 'stargazerCount',
      render: (value: number) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '数据任务',
      dataIndex: "id",
      render: (value: string) => {
        return [...getTaskTypeListFromDataSharePartnerConfig(config).map(item => <Tag key={item.type} className={styles.tag} color="#108ee9">{getDisplayNameByTaskType(item.type)}</Tag>)];
      },
      minWidth: 150,
    },
    {
      title: '最近更新时间',
      dataIndex: 'updatedAt',
      render: (value: string) => (
        <Text>{dateToStr(dayjs(value), 'YYYY-MM-DD')}</Text>
      ),
      minWidth: 120,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (value: string) => (
        <Text>{dateToStr(dayjs(value), 'YYYY-MM-DD')}</Text>
      ),
      minWidth: 120,
    },
  ];

  const fetchData = () => {
    if (_loading) {
      return;
    }
    _loading = true;
    setLoading(true);
    (async () => {
      if (!auth) {
        messageApi.open({
          key: "needLogin",
          type: 'warning',
          content: `需要登录后查看`,
        });
        return;
      }
      scrollToTop();
      try {
        const result = await GithubApi.queryRepository(searchParam);
        const { nodes } = result.search;
        const map = new Map<string, RepositoryData>();
        nodes.map((item, index) => {
          map.set(item.id, item);
        });
        setIdObjectMap(map);
        if (nodes.length > 0) {
          //获取数据共享计划伙伴
          const searchDataSharePartnerParam = new SearchDataSharePartnerBO();
          searchDataSharePartnerParam.usernameList = nodes.flatMap(
            (item) => item.owner.login
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
            dataSharePartnerMap.set(`${item.username}${item.reponame}`, null);
          }
          setDataSharePartnerMap(dataSharePartnerMap);
        }
        setDataSource(nodes);
        setTotal(result.search.repositoryCount);
        setPageInfo(result.search.pageInfo);
      } catch (e) {
        messageApi.open({
          key: "queryFailure",
          type: 'error',
          content: `查询失败`,
        });
      } finally {
        _loading = false;
        setLoading(false);
      }
    })();
  };

  useEffect(fetchData, [searchParam, currentPage, pageSize, refresh]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record) => ({
      disabled:
        record.owner.login === username ||
        record.name != repo ||
        dataSharePartnerMap.has(record.owner.login),
    }),
  };

  const onPageChange = (page: number, pageSize: number) => {
    if (page > currentPage) {
      searchParam.first = pageSize;
      searchParam.last = null;
      searchParam.after = pageInfo ? pageInfo.endCursor : null;
      searchParam.before = null;
      setCurrentPage(currentPage + 1);
    } else {
      searchParam.first = null;
      searchParam.last = pageSize;
      searchParam.after = null;
      searchParam.before = pageInfo ? pageInfo.startCursor : null;
      setCurrentPage(currentPage - 1);
    }
    setPageSize(pageSize);
    setSearchParam(Object.assign({}, searchParam));
  };

  const scrollToTop = () => {
    topRef.current.scrollIntoView();
  };

  const onAdd = async () => {
    setAddLoading(true);
    try {
      const selectedRows = dataSource.filter((item) => {
        return selectedRowKeys.find((key) => key == item.id);
      });
      const entityList = [];
      for (let i = 0; i < selectedRows.length; i++) {
        const item = selectedRows[i];
        const entity = new DataSharePartner();
        entity.username = item.owner.login;
        entity.reponame = item.name;
        entity.repoType = DEFAULT_REPO_TYPE;
        entity.config = config;
        entity.enable = true;
        entityList.push(entity);
      }
      await DataSharePartnerApi.dataSharePartnerBatchAddOrUpdate(entityList);
      onAddCallback ? onAddCallback() : null;
    } finally {
      setAddLoading(false);
    }
    setRefresh(!refresh);
  };

  const hasSelected = selectedRowKeys.length > 0;

  return (
    <>
      {contextHolder}
      <Spin spinning={loading}>
        <Flex vertical gap={10}>
          <Flex ref={topRef} vertical gap={10}>
            <Flex justify="end">
              <Button
                type="primary"
                loading={addLoading}
                disabled={!hasSelected}
                onClick={onAdd}
              >
                添加
              </Button>
            </Flex>
            <Flex justify='end'>
              <Pagination
                simple
                current={currentPage}
                total={total}
                pageSize={pageSize}
                onChange={onPageChange}
              />
            </Flex>
            <Space size="small" direction="vertical">
              <Table<RepositoryData>
                rowKey={(record) => {
                  return record.id;
                }}
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                rowSelection={rowSelection}
              />
              <Flex justify="end">
                <Pagination
                  simple
                  current={currentPage}
                  total={total}
                  pageSize={pageSize}
                  onChange={onPageChange}
                />
              </Flex>
            </Space>
          </Flex>
        </Flex>
      </Spin >
    </>
  );
};
export default StandardData;
