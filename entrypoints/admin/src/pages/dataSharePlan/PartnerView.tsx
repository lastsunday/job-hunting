import { DataSharePartnerApi } from "@/common/api";
import { DEFAULT_DATA_REPO, DEFAULT_REPO_TYPE } from "@/common/config";
import { DataSharePartner } from "@/common/data/domain/dataSharePartner";
import { dateToStr } from "@/common/utils";
import { Button, Col, DatePicker, Flex, Form, Input, Modal, Space, TableColumnsType, Typography } from "antd";
import dayjs from "dayjs";
import BasicTable from "../../components/BasicTable";
import PartnerEdit from "./PartnerEdit";
import PartnerFind from "./PartnerFind";
const { Text } = Typography;
const { RangePicker } = DatePicker;

const fillSearchParam = (searchParam, values) => {
    const { username, createDatetimeRange, updateDatetimeRange } = values;
    searchParam.username = username;
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

const PartnerView: React.FC = () => {

    const [isPartnerEditModalOpen, setIsPartnerEditModalOpen] = useState(false);
    const [editPartnerData, setEditPartnerData] = useState<DataSharePartner>();
    const [mode, setMode] = useState<"add" | "update">("update");
    const tableRef = useRef();

    const [isPartnerFindModalOpen, setIsPartnerFindModalOpen] = useState(false);

    const searchFields =
    {
        common: [
            <Col span={8} key="username">
                <Form.Item
                    name={`username`}
                    label={`用户名`}
                >
                    <Input placeholder="请输入用户名" allowClear></Input>
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

    const columns: TableColumnsType<DataSharePartner> = [
        {
            title: '编号',
            dataIndex: 'id',
            render: (value: string) => <Text copyable>{value}</Text>,
            minWidth: 100,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            render: (value: string) => <Text >{value}</Text>,
            minWidth: 100,
        },
        {
            title: '仓库名',
            dataIndex: 'reponame',
            render: (value: string) => <Text >{value}</Text>,
            minWidth: 100,
        },
        {
            title: '仓库类型',
            dataIndex: 'repoType',
            render: (value: string) => <Text >{value}</Text>,
            minWidth: 100,
        },
        {
            title: '创建时间',
            dataIndex: 'createDatetime',
            render: (value: string) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
            minWidth: 100,
        },
        {
            title: '更新时间',
            dataIndex: 'updateDatetime',
            render: (value: string) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
            minWidth: 100,
        },
        {
            title: '操作',
            key: 'action',
            fixed: "right",
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" onClick={() => {
                        setMode("update");
                        setEditPartnerData({
                            id: record.id,
                            username: record.username,
                            reponame: record.reponame,
                            repoType: record.repoType,
                        });
                        setIsPartnerEditModalOpen(true);
                    }}>编辑伙伴信息</Button>
                </Space>
            ),
        },
    ];

    const onPartnerAdd = () => {
        setMode("add");
        setEditPartnerData({
            reponame: DEFAULT_DATA_REPO,
            repoType: DEFAULT_REPO_TYPE,
        });
        setIsPartnerEditModalOpen(true);
    }

    const onPartnerSave = async (data: DataSharePartner) => {
        const { id, username, reponame, repoType } = data;
        let entity = new DataSharePartner();
        entity.id = id;
        entity.username = username;
        entity.reponame = reponame;
        entity.repoType = repoType;
        await DataSharePartnerApi.dataSharePartnerAddOrUpdate(entity);
        setIsPartnerEditModalOpen(false);
        tableRef?.current.refresh();
    }

    const onPartnerDelete = async (keys: React.Key[]) => {
        await DataSharePartnerApi.dataSharePartnerDeleteByIds(keys);
        tableRef?.current.refresh();
    }

    return <>
        <BasicTable
            ref={tableRef}
            mode={["r", "c", "d"]}
            onAdd={onPartnerAdd}
            onDelete={onPartnerDelete}
            searchProps={{
                columns,
                searchFields,
                fillSearchParam,
                search: async (searchParam) => {
                    return await DataSharePartnerApi.searchDataSharePartner(searchParam);
                },
            }}
            rowKeyFunction={(record) => { return record.id }}
            additionMenu={<Flex><Button onClick={
                () => {
                    setIsPartnerFindModalOpen(true);
                }
            }>寻找伙伴</Button></Flex>}
        ></BasicTable>
        <Modal
            title={`${mode == "update" ? "编辑伙伴信息" : "新增伙伴信息"}`}
            open={isPartnerEditModalOpen}
            onCancel={() => {
                setIsPartnerEditModalOpen(false);
            }}
            maskClosable={false}
            footer={null}
            style={{ maxWidth: "1000px" }}
            width="80%"
            destroyOnClose
        >
            <PartnerEdit
                mode={mode}
                data={editPartnerData}
                onSave={onPartnerSave}
            ></PartnerEdit>
        </Modal>
        <Modal
            title={`寻找伙伴`}
            open={isPartnerFindModalOpen}
            onCancel={() => {
                setIsPartnerFindModalOpen(false);
            }}
            maskClosable={false}
            footer={null}
            style={{ maxWidth: "1000px" }}
            width="80%"
            destroyOnClose
        >
            <PartnerFind

            ></PartnerFind>
        </Modal>
    </>
}

export default PartnerView;