import { TaskApi } from "@/common/api";
import { TaskDTO } from "@/common/data/dto/taskDTO";
import { dateToStr } from "@/common/utils";
import { Icon } from "@iconify/react";
import { Col, DatePicker, Form, Select, TableColumnsType, Typography } from "antd";
import dayjs from "dayjs";
import BasicTable from "../../components/BasicTable";
import { useDataSharePlan } from "../../hooks/dataSharePlan";
const { Text } = Typography;
const { RangePicker } = DatePicker;

const fillSearchParam = (searchParam, values) => {
    const { createDatetimeRange, updateDatetimeRange, type, status } = values;
    searchParam.typeList = type;
    searchParam.statusList = status;
    if (createDatetimeRange && createDatetimeRange.length > 0) {
        searchParam.startDatetimeForCreate = dayjs(createDatetimeRange[0]);
        searchParam.endDatetimeForCreate = dayjs(createDatetimeRange[1]);
    } else {
        searchParam.startDatetimeForCreate = null;
        searchParam.endDatetimeForCreate = null;
    }
    if (updateDatetimeRange && updateDatetimeRange.length > 0) {
        searchParam.startDatetimeForUpdate = dayjs(updateDatetimeRange[0]);
        searchParam.endDatetimeForUpdate = dayjs(updateDatetimeRange[1]);
    } else {
        searchParam.startDatetimeForUpdate = null;
        searchParam.endDatetimeForUpdate = null;
    }
}

const TaskView: React.FC = () => {

    const tableRef = useRef();
    const { taskFormat, statusFormat, getColorForStatus,
        getIconStringForStatus, isDownloadType, isUploadType, isMergeType,
        typeWhitelist, statusWhitelist
    } = useDataSharePlan();

    const searchFields =
    {
        common: [
            <Col span={8} key="type">
                <Form.Item
                    name={`type`}
                    label={`任务类型`}
                >
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: "100%" }}
                        placeholder="请选择任务类型"
                        options={typeWhitelist}
                        fieldNames={{ label: "value", value: "code" }}
                    />
                </Form.Item>
            </Col>,
            <Col span={8} key="status">
                <Form.Item
                    name={`status`}
                    label={`任务状态`}
                >
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: "100%" }}
                        placeholder="请选择任务状态"
                        options={statusWhitelist}
                        fieldNames={{ label: "value", value: "code" }}
                    />
                </Form.Item>
            </Col>,
        ],
        expand: [
            <Col span={8} key="createDatetimeRange">
                <Form.Item
                    name={`createDatetimeRange`}
                    label={`创建时间`}
                >
                    <RangePicker />
                </Form.Item>
            </Col>,
            <Col span={8} key="updateDatetimeRange">
                <Form.Item
                    name={`updateDatetimeRange`}
                    label={`更新时间`}
                >
                    <RangePicker />
                </Form.Item>
            </Col>
        ]
    }

    const columns: TableColumnsType<TaskDTO> = [
        {
            title: '编号',
            dataIndex: 'id',
            render: (value: string) => <Text copyable>{value}</Text>,
            minWidth: 100,
        },
        {
            title: '类型',
            dataIndex: 'type',
            render: (value: string) => <Text>{taskFormat(value)}</Text>,
            minWidth: 100,
        },
        {
            title: '状态',
            dataIndex: 'status',
            render: (value: string) => <Text style={{ color: getColorForStatus(value) }}><Icon icon={getIconStringForStatus(value)}></Icon>{statusFormat(value)}</Text>,
            minWidth: 100,
        },
        {
            title: '任务摘要',
            dataIndex: 'detail',
            render: (value: any) => <>
                {isDownloadType(value.type) ? <Col>
                    <div>
                        <Icon icon="mdi:git-repository" />仓库：{value.username}/{
                            value.reponame
                        }
                    </div>
                    <div>
                        <Icon icon="fluent-mdl2:date-time" />日期：{dateToStr(
                            value.datetime, "YYYY-MM-DD") ?? `N/A`}
                    </div>
                </Col>
                    : null}
                {isUploadType(value.type) ? <Col>
                    <div>
                        <Icon icon="mdi:git-repository" />仓库：{value.username}/{
                            value.reponame
                        }
                    </div>
                    <div>
                        <Icon icon="fluent-mdl2:date-time" />日期：{dateToStr(
                            value.startDatetime, "YYYY-MM-DD") ?? `N/A`}-{dateToStr(
                                value.endDatetime, "YYYY-MM-DD") ?? `N/A`}
                    </div>
                    <div>
                        <Icon icon="mdi:database-arrow-up" />数据量：{value.dataCount ?? 0
                        }
                    </div>
                </Col>
                    : null}
                {isMergeType(value.type) ? <Col>
                    <div>
                        <Icon icon="mdi:git-repository" />仓库：{value.username}/{
                            value.reponame
                        }
                    </div>
                    <div>
                        <Icon icon="stash:data-date" />日期：{
                            dateToStr(
                                value.datetime, "YYYY-MM-DD") ?? `N/A`}
                    </div>
                    <div>
                        <Icon icon="mdi:database-plus" />数据量：{value.dataCount ?? 0}
                    </div>
                    <div>
                        <Icon icon="mdi:file" />文件编号：<Text copyable>{value.dataId}</Text>
                    </div>
                </Col>
                    : null}
            </>,
            minWidth: 300,
        },
        {
            title: '执行耗时',
            dataIndex: 'costTime',
            render: (value: string) => <Text>{`${value} ms`}</Text>,
            minWidth: 100,
        },
        {
            title: '重试次数',
            dataIndex: 'retryCount',
            render: (value: string) => <Text>{value}</Text>,
            minWidth: 100,
        },
        {
            title: '执行信息',
            dataIndex: 'errorReason',
            render: (value: string) => <Text>{value}</Text>,
            minWidth: 100,
        },
        {
            title: '创建时间',
            dataIndex: 'createDatetime',
            render: (value: string) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
            minWidth: 100,
        },
        {
            title: '更新时间',
            dataIndex: 'updateDatetime',
            render: (value: string) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
            minWidth: 100,
        },
    ];

    return <>
        <BasicTable
            ref={tableRef}
            mode={["r"]}
            searchProps={{
                columns,
                searchFields,
                fillSearchParam,
                search: async (searchParam) => {
                    return await TaskApi.searchTaskWithDetail(searchParam);
                },
            }}
        ></BasicTable>
    </>
}

export default TaskView;