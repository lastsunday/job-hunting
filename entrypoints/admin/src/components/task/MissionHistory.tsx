import { MissionLogApi } from "@/common/api";
import { SearchMissionLogBO } from "@/common/data/bo/searchMissionLogBO";
import { errorLog } from "@/common/log";
import { dateToStr } from "@/common/utils";
import {
    Button, Descriptions, Flex, GetProp,
    Space, Table, TableColumnsType, TablePaginationConfig,
    TableProps, Typography, message
} from "antd";
import { SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { MissionLogData, MissionLogDetailData } from "../../data/MissionLogData";
import { TaskData } from "../../data/TaskData";
import { useTask } from "../../hooks/task";
dayjs.extend(duration)

const { Text } = Typography;

const { convertMissionLogList, missionStatusFormat, missionErrorFormat } = useTask();

const columns: TableColumnsType<MissionLogData> = [
    {
        title: '创建时间',
        dataIndex: 'createDatetime',
        render: (text: string) => <Text>{text}</Text>,
    },
    {
        title: '运行结果',
        dataIndex: 'status',
        render: (text: string) => <Text>{missionStatusFormat(text)}</Text>,
    },
    {
        title: '耗时',
        dataIndex: 'detail',
        render: (item: MissionLogDetailData) => <Text>{
            dayjs.duration(dayjs(item.endDatetime).diff(item.startDatetime)).minutes()
        }分{
                dayjs.duration(dayjs(item.endDatetime).diff(item.startDatetime)).seconds()
            }秒</Text>,
    },
    {
        title: '错误原因',
        dataIndex: 'reason',
        render: (text: string) => <Text>{missionErrorFormat(text)}</Text>,
    },
];

interface TableParams {
    pagination?: TablePaginationConfig;
    sortField?: SorterResult<any>['field'];
    sortOrder?: SorterResult<any>['order'];
    filters?: Parameters<GetProp<TableProps, 'onChange'>>[1];
}

export type MissionHistoryProps = {
    data: TaskData;
}

const MissionHistory: React.FC<MissionHistoryProps> = ({ data }) => {

    const [selectionType, setSelectionType] = useState<'checkbox' | 'radio'>('checkbox');
    const [dataSource, setDataSource] = useState<MissionLogData[]>();
    const [loading, setLoading] = useState(false);
    const [tableParams, setTableParams] = useState<TableParams>({
        pagination: {
            current: 1,
            pageSize: 20,
            showSizeChanger: true
        },
    });
    const [selection, setSelection] = useState<MissionLogData[]>();
    const [refresh, setRefresh] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const rowSelection: TableProps<MissionLogData>['rowSelection'] = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: MissionLogData[]) => {
            setSelection(selectedRows);
        },
        getCheckboxProps: (record: MissionLogData) => ({
            id: record.id,
        }),
    };

    const handleTableChange: TableProps<MissionLogData>['onChange'] = (pagination, filters, sorter) => {
        setTableParams({
            pagination,
            filters,
            sortOrder: Array.isArray(sorter) ? undefined : sorter.order,
            sortField: Array.isArray(sorter) ? undefined : sorter.field,
        });

        // `dataSource` is useless since `pageSize` changed
        if (pagination.pageSize !== tableParams.pagination?.pageSize) {
            setDataSource([]);
        }
    };

    const getSearchParam = () => {
        let searchParam = new SearchMissionLogBO();
        searchParam.pageNum = tableParams.pagination.current;
        searchParam.pageSize = tableParams.pagination.pageSize;
        searchParam.missionId = data.id;
        searchParam.orderByColumn = "update_datetime"
        searchParam.orderBy = "DESC";
        return searchParam;
    }

    const fetchData = () => {
        (async () => {
            setLoading(true);
            let searchResult = await MissionLogApi.searchMissionLog(getSearchParam());
            setDataSource(convertMissionLogList(searchResult.items));
            setLoading(false);
            setTableParams({
                ...tableParams,
                pagination: {
                    ...tableParams.pagination,
                    total: searchResult.total,
                    showTotal: (total) => `共 ${total} 条`,
                },
            });
        })();
    };

    useEffect(fetchData, [
        tableParams.pagination?.current,
        tableParams.pagination?.pageSize,
        tableParams?.sortOrder,
        tableParams?.sortField,
        JSON.stringify(tableParams.filters),
        refresh,
    ]);

    const onDelete = async () => {
        if (selection && selection.length > 0) {
            try {
                let ids = selection.map(item => { return item.id });
                await MissionLogApi.missionLogDeleteByIds(ids);
                setRefresh(!refresh)
                messageApi.open({
                    type: 'success',
                    content: `删除${selection.length}条记录成功`,
                });
            } catch (e) {
                errorLog(e);
                messageApi.open({
                    type: 'error',
                    content: '删除记录异常',
                });
            }
        } else {
            messageApi.open({
                type: 'error',
                content: '请选择需要删除的记录',
            });
        }
    }

    return <>
        {contextHolder}
        <Flex vertical>
            <Space direction="vertical">
                <Flex>
                    <Button danger onClick={onDelete}>删除</Button>
                </Flex>
                <Table<MissionLogData>
                    rowKey={(record) => record.id}
                    rowSelection={{ type: selectionType, ...rowSelection }}
                    columns={columns}
                    dataSource={dataSource}
                    pagination={tableParams.pagination}
                    loading={loading}
                    onChange={handleTableChange}
                    expandable={{
                        expandedRowRender: (record) => <>
                            <Flex vertical>
                                <Space direction="vertical">
                                    <Flex>
                                        <Descriptions title="">
                                            <Descriptions.Item label="开始时间">{dateToStr(record.detail.startDatetime,"YYYY-MM-DD")}</Descriptions.Item>
                                            <Descriptions.Item label="结束时间">{dateToStr(record.detail.startDatetime,"YYYY-MM-DD")}</Descriptions.Item>
                                            <Descriptions.Item label="浏览页数">{record.detail.count}</Descriptions.Item>
                                        </Descriptions>
                                    </Flex>
                                    <Flex vertical>
                                        {
                                            record.detail.logList.map((item, index) => (
                                                <Text key={item}>{item}</Text>
                                            ))
                                        }
                                    </Flex>
                                </Space>
                            </Flex>
                        </>,
                    }}
                />
            </Space>
        </Flex>
    </>
}

export default MissionHistory;