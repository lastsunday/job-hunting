import { Avatar, Button, Flex, Pagination, Space, Spin, Table, TableColumnsType, Tooltip, Typography } from "antd";
const { Text } = Typography;

import { DataSharePartnerApi } from "@/common/api";
import { GithubApi } from "@/common/api/github";
import { COMMENT_PAGE_SIZE, DEFAULT_DATA_REPO, DEFAULT_REPO_TYPE } from "@/common/config";
import { SearchDataSharePartnerBO } from "@/common/data/bo/searchDataSharePartnerBO";
import { DataSharePartner } from "@/common/data/domain/dataSharePartner";
import { dateToStr } from "@/common/utils";
import { Icon } from "@iconify/react";
import { TableRowSelection } from "antd/lib/table/interface";
import dayjs from "dayjs";
import { useShallow } from "zustand/shallow";
import { PageInfo } from "../../data/PageInfo";
import { Owner, RepositoryData } from "../../data/RepositoryData";
import useAuthStore from "../../store/AuthStore";
import styles from "./PartnerFind.module.css";

export type PartnerFindProps = {

};
const PartnerFind: React.FC<PartnerFindProps> = ({ }) => {

    const [loading, setLoading] = useState<boolean>(false);
    const [dataSource, setDataSource] = useState<RepositoryData[]>([]);
    const [refresh, setRefresh] = useState(false);
    const [searchParam, setSearchParam] = useState({
        first: COMMENT_PAGE_SIZE,
        after: null,
        last: null,
        before: null,
        repo: DEFAULT_DATA_REPO,
    })
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [idObjectMap, setIdObjectMap] = useState<Map<string, RepositoryData>>(new Map());
    const [dataSharePartnerMap, setDataSharePartnerMap] = useState<Map<string, void>>(new Map());
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(COMMENT_PAGE_SIZE);
    const [pageInfo, setPageInfo] = useState<PageInfo>();
    const topRef = useRef();
    const [addLoading, setAddLoading] = useState(false);
    const [username] = useAuthStore(useShallow(((state) => [
        state.username,
    ])));

    const genState = (id: string) => {
        if (!idObjectMap.has(id)) {
            return null;
        }
        const item = idObjectMap.get(id);
        if (item.owner.login == username) {
            return <>
                <Tooltip title="不能添加自己">
                    <Icon icon="icon-park-outline:invalid-files" width="20" height="20" />
                </Tooltip>
            </>
        } else if (item.name != DEFAULT_DATA_REPO) {
            return <>
                <Tooltip title="仓库名不符合条件">
                    <Icon icon="icon-park-outline:invalid-files" width="20" height="20" />
                </Tooltip>
            </>
        } else {
            if (dataSharePartnerMap.has(item.owner.login)) {
                return <>
                    <Tooltip title="已添加到伙伴列表">
                        <Icon className={styles.partnerExists} icon="carbon:partnership" width="20" height="20" />
                    </Tooltip>
                </>
            } else {
                return <>
                    <Tooltip title="可添加到伙伴列表">
                        <Icon className={styles.partnerAdd} icon="basil:add-outline" width="20" height="20" />
                    </Tooltip>
                </>
            }
        }
    }

    const columns: TableColumnsType<RepositoryData> = [
        {
            title: '状态',
            dataIndex: 'id',
            render: (value: string) => <Flex>{
                genState(value)
            }
            </Flex>,
            minWidth: 60,
        },
        {
            title: '头像',
            dataIndex: 'owner',
            render: (value: Owner) => <Avatar src={value.avatarUrl} />,
        },
        {
            title: '用户名',
            dataIndex: 'owner',
            render: (value: Owner) => <Text>{value.login}</Text>,
            minWidth: 100,
        },
        {
            title: '仓库名',
            dataIndex: 'name',
            render: (value: string) => <Text>{value}</Text>,
        },
        {
            title: '星数',
            dataIndex: 'stargazerCount',
            render: (value: number) => <Text>{value}</Text>,
        },
        {
            title: '最近更新时间',
            dataIndex: 'updatedAt',
            render: (value: string) => <Text>{dateToStr(dayjs(value),"YYYY-MM-DD")}</Text>,
            minWidth: 100,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            render: (value: string) => <Text>{dateToStr(dayjs(value),"YYYY-MM-DD")}</Text>,
            minWidth: 100,
        },
    ]

    const fetchData = () => {
        (async () => {
            scrollToTop();
            setLoading(true);
            let result = await GithubApi.queryRepository(searchParam);
            const { nodes } = result.search;
            const map = new Map<string, RepositoryData>();
            nodes.map((item, index) => {
                map.set(item.id, item);
            })
            setIdObjectMap(map);
            if (nodes.length > 0) {
                //获取数据共享计划伙伴
                const searchDataSharePartnerParam = new SearchDataSharePartnerBO();
                searchDataSharePartnerParam.usernameList = nodes.flatMap(item => item.owner.login);
                searchDataSharePartnerParam.orderByColumn = "updateDatetime";
                searchDataSharePartnerParam.orderBy = "DESC";
                let partnerResult = await DataSharePartnerApi.searchDataSharePartner(searchDataSharePartnerParam);
                let partnerResultItems = partnerResult.items;
                const dataSharePartnerMap = new Map();
                for (let i = 0; i < partnerResultItems.length; i++) {
                    let item = partnerResultItems[i];
                    dataSharePartnerMap.set(item.username, null);
                }
                setDataSharePartnerMap(dataSharePartnerMap);
            }
            setDataSource(nodes);
            setTotal(result.search.repositoryCount);
            setPageInfo(result.search.pageInfo);
            setLoading(false);
        })();
    };

    useEffect(() => {
        fetchData();
    }, [])

    useEffect(fetchData, [
        searchParam,
        currentPage,
        pageSize,
        refresh,
    ]);

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection: TableRowSelection<any> = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record) => ({
            disabled: record.owner.login === username ||
                record.name != DEFAULT_DATA_REPO ||
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
    }

    const scrollToTop = () => {
        topRef.current.scrollIntoView();
    }

    const onAdd = async () => {
        setAddLoading(true);
        try {
            const selectedRows = dataSource.filter(item => {
                return selectedRowKeys.find(key => key == item.id);
            });
            const entityList = [];
            for (let i = 0; i < selectedRows.length; i++) {
                const item = selectedRows[i];
                const entity = new DataSharePartner();
                entity.username = item.owner.login;
                entity.reponame = item.name;
                entity.repoType = DEFAULT_REPO_TYPE;
                entityList.push(entity);
            }
            await DataSharePartnerApi.dataSharePartnerBatchAddOrUpdate(entityList);
        } finally {
            setAddLoading(false);
        }
        setRefresh(!refresh);
    }

    const hasSelected = selectedRowKeys.length > 0;

    return <>
        <Spin spinning={loading}>
            <Flex vertical gap={10}>
                <Flex justify="end">
                    <Button type="primary" loading={addLoading} disabled={!hasSelected} onClick={onAdd}>添加</Button>
                </Flex>
                <Flex ref={topRef} vertical gap={10}>
                    <Flex justify="end">
                        <Pagination simple current={currentPage} total={total} pageSize={pageSize} onChange={onPageChange} />
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
                            <Pagination simple current={currentPage} total={total} pageSize={pageSize} onChange={onPageChange} />
                        </Flex>
                    </Space>
                </Flex>
            </Flex>
        </Spin>
    </>
}
export default PartnerFind;
