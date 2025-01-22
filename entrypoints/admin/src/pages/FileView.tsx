import { FileApi } from "@/common/api";
import { downloadBlob, exportExcelFromBase64ZipFile, getFileName } from "@/common/file";
import { errorLog } from "@/common/log";
import { convertToAbbreviation, dateToStr } from "@/common/utils";
import { base64ToBlob } from "@/common/utils/base64";
import { getExcelDataFromZipFile } from "@/common/zip";
import {
    Button,
    Col,
    DatePicker,
    Form,
    Input,
    Modal,
    Select,
    Space,
    TableColumnsType,
    Typography, message
} from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../components/BasicTable";
import ExcelPreview from "../components/ExcelPreview";
import { FileData } from "../data/FileData";
import { useFile } from "../hooks/file";
const { convertSortField } = useFile();
const { Text } = Typography;
const { RangePicker } = DatePicker;

dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
    const { createDatetimeRange, updateDatetimeRange, name, id, isDelete } = values;
    searchParam.id = id;
    searchParam.name = name;
    searchParam.isDelete = isDelete;
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

const FileView: React.FC = () => {

    const [messageApi, contextHolder] = message.useMessage();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<ArrayBuffer>();
    const [previewFileName, setPreviewFileName] = useState("");
    const tableRef = useRef();

    const columns: TableColumnsType<FileData> = [
        {
            title: '编号',
            dataIndex: 'id',
            render: (value: string) => <Text copyable style={{ width: 100 }} title={value}>{`${value && value.length > 5 ? value.slice(0, 5)+"..." : value}`}</Text>,
            width: 100,
        },
        {
            title: '名称',
            dataIndex: 'name',
            render: (value: string) => <Text copyable title={value}>{value}</Text>,
            minWidth: 200,
        },

        {
            title: '编码',
            dataIndex: 'encoding',
            render: (value: string) => <Text title={value}>{value}</Text>,
            minWidth: 100,
        },
        {
            title: '大小',
            dataIndex: 'size',
            render: (value: string) => <Text title={`${value} bytes`}>{convertToAbbreviation(value)}</Text>,
            minWidth: 100,
        },
        {
            title: '类型',
            dataIndex: 'type',
            render: (value: string) => <Text title={value}>{value}</Text>,
            minWidth: 100,
        },
        {
            title: 'SHA',
            dataIndex: 'sha',
            render: (value: string) => <Text copyable style={{ width: 100 }} title={value}>{`${value && value.length > 5 ? value.slice(0, 5)+"..." : value}`}</Text>,
            width: 100,
        },
        {
            title: '创建时间',
            dataIndex: 'createDatetime',
            render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
            minWidth: 100,
            sorter: true,
        },
        {
            title: '更新时间',
            dataIndex: 'updateDatetime',
            render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
            minWidth: 100,
            sorter: true,
        },
        {
            title: '文件状态',
            dataIndex: 'isDelete',
            render: (value: boolean) => <Text>{value ? `已删除` : `正常`}</Text>,
            minWidth: 100,
            sorter: true,
        },
        {
            title: '操作',
            key: 'action',
            fixed: "right",
            render: (_, record) => (
                !record.isDelete ? <Space size="middle">
                    <Button type="link" onClick={async () => {
                        const zipFileName = record.name;
                        const fileName = getFileName(zipFileName);
                        try {
                            setPreviewFileName(`(${fileName}.xlsx[${record.id}])`);
                            setEditData(await getExcelDataFromZipFile(record.content, fileName));
                            setIsEditModalOpen(true);
                        } catch (e) {
                            errorLog(e);
                            messageApi.error(e.message);
                        }
                    }}>预览</Button>
                    <Button type="link" onClick={() => {
                        const zipFileName = record.name;
                        const fileName = getFileName(zipFileName);
                        try {
                            exportExcelFromBase64ZipFile(record.content, fileName + ".xlsx");
                        } catch (e) {
                            errorLog(e);
                            messageApi.error(e.message);
                        }
                    }}>下载</Button>
                    <Button type="link" onClick={async () => {
                        const zipFileName = record.name;
                        try {
                            downloadBlob(
                                base64ToBlob(record.content),
                                zipFileName,
                                "application/octet-stream"
                            );
                        } catch (e) {
                            errorLog(e);
                            messageApi.error(e.message);
                        }
                    }}>下载源文件</Button>
                </Space> : null
            ),
        },
    ];

    const searchFields = {
        common: [
            <Col span={8} key="id">
                <Form.Item
                    name={`id`}
                    label={`编号`}
                >
                    <Input allowClear placeholder="请输入编号"></Input>
                </Form.Item>
            </Col>,
            <Col span={8} key="name">
                <Form.Item
                    name={`name`}
                    label={`名称`}
                >
                    <Input allowClear placeholder="请输入名称" />
                </Form.Item>
            </Col>,
            <Col span={8} key="isDelete">
                <Form.Item
                    name={`isDelete`}
                    label={`文件状态`}
                >
                    <Select allowClear options={[{ value: 0, label: <span>正常</span> }, { value: 1, label: <span>已删除</span> }]} />
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

    const onDelete = async (keys: React.Key[]) => {
        try {
            await FileApi.fileLogicDeleteByIds(keys);
        } catch (e) {
            messageApi.error(e.message);
        }
        tableRef?.current.refresh();
    }

    return <>
        {contextHolder}
        <BasicTable
            ref={tableRef}
            mode={["r", "d"]}
            onDelete={onDelete}
            searchProps={{
                columns,
                searchFields,
                fillSearchParam,
                convertSortField,
                search: async (searchParam) => {
                    return await FileApi.searchFile(searchParam);
                },
                orderByColumn: "createDatetime",
                searchParam: {
                    isDelete: false,
                }
            }}
            rowKeyFunction={(record) => { return record.id }}
        ></BasicTable>
        <Modal
            title={`预览${previewFileName}`}
            open={isEditModalOpen}
            onCancel={() => {
                setIsEditModalOpen(false);
            }}
            maskClosable={false}
            footer={null}
            width="90%"
            destroyOnClose
        >
            <ExcelPreview source={editData}></ExcelPreview>
        </Modal>
    </>
}

export default FileView;