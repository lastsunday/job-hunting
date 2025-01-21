import { dbDelete, dbExport, dbImport } from "@/common/api/common";
import { downloadURL } from "@/common/file";
import { base64ToBytes, bytesToBase64 } from "@/common/utils/base64.js";
import { Icon } from "@iconify/react";
import { Button, Flex, Input, Modal, Popconfirm, Spin, Switch, Typography, message } from "antd";
import dayjs from "dayjs";
const { Text } = Typography;

export type DatabaseBackupRestoreProps = {

};

const DatabaseBackupRestore: React.FC<DatabaseBackupRestoreProps> = ({ }) => {
    const title = "数据库";
    const [isDangerDatabaseMenuOpen, setIsDangerDatabaseMenuOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [files, setFiles] = useState([]);
    const [messageApi, contextHolder] = message.useMessage();

    const [loading, setLoading] = useState(false);
    const { confirm } = Modal;

    const onExport = async () => {
        setExportLoading(true);
        let url = null;
        try {
            url = await dbExport();
            downloadURL(
                url,
                "数据库-" + dayjs(new Date()).format("YYYYMMDDHHmmss") + ".tar.gz",
            );
        } finally {
            url ? URL.revokeObjectURL(url) : null;
            setExportLoading(false);
        }
    }

    const handleFileImport = async (e) => {
        setFiles(e.target.files);
    };

    const reloadExtension = async () => {
        chrome.runtime.reload();
    };

    const confirmFileImport = async () => {
        if (files && files.length > 0) {
            setImportLoading(true);
            setLoading(true);
            setTimeout(async () => {
                let url = URL.createObjectURL(files[0]);
                try {
                    await dbImport(url);
                    setIsImportModalOpen(false);
                    messageApi.success(`恢复${title}成功`)
                    confirm({
                        title: '点击确定按钮重启程序',
                        maskClosable: false,
                        okText: '确定',
                        cancelButtonProps: { style: { visibility: "hidden" } },
                        onOk() {
                            reloadExtension();
                        },
                    });
                } catch (e) {
                    messageApi.error(`恢复${title}失败${e.message}`);
                } finally {
                    url ? URL.revokeObjectURL(url) : null;
                    setLoading(false);
                }
            }, 0);
        } else {
            messageApi.info(`请选择有效的${title}文件`);
        }
    };

    const onDelete = async () => {
        setDeleteLoading(true);
        await dbDelete();
        messageApi.success(`删除数据库成功`)
        confirm({
            title: '点击确定按钮重启程序',
            maskClosable: false,
            okText: '确定',
            cancelButtonProps: { style: { visibility: "hidden" } },
            onOk() {
                reloadExtension();
            },
        });
        setDeleteLoading(false);
    }

    const getSwitchStyle = () => {
        if (isDangerDatabaseMenuOpen) {
            return { backgroundColor: "red" };
        } else {
            return null
        }
    }

    return <>
        {contextHolder}
        <Spin spinning={loading} fullscreen />
        <Flex vertical gap={5}>
            <Flex align="center" gap={5}>
                <Text>{title}</Text>
                <Switch style={getSwitchStyle()} checkedChildren="危险操作开启" unCheckedChildren="危险操作关闭" size="small" checked={isDangerDatabaseMenuOpen} onChange={(checked) => {
                    setIsDangerDatabaseMenuOpen(checked);
                }}></Switch>
            </Flex>
            <Flex gap={5}>
                <Popconfirm
                    title="导出数据库"
                    description="确认导出数据库？"
                    onConfirm={onExport}
                    okText="是"
                    cancelText="否"
                >
                    <Button loading={exportLoading}><Icon icon="mdi:document" />{title}导出</Button>
                </Popconfirm>
                <Button onClick={() => {
                    setImportLoading(false);
                    setIsImportModalOpen(true);
                }}><Icon icon="mdi:file-document-box-plus" />{title}恢复</Button>
                {isDangerDatabaseMenuOpen ? <Popconfirm
                    title="删除"
                    description="确认删除数据库？"
                    onConfirm={onDelete}
                    okText="是"
                    cancelText="否"
                >
                    <Button style={{ backgroundColor: "red", color: "white" }} loading={deleteLoading}><Icon icon="mdi:document" />{title}删除</Button>
                </Popconfirm> : null}

            </Flex>
        </Flex>
        <Modal
            title={`${title}恢复`}
            open={isImportModalOpen}
            onCancel={() => {
                setIsImportModalOpen(false);
            }}
            footer={null}
            style={{ maxWidth: "500px" }}
            width="80%"
            destroyOnClose
        >
            <Flex vertical gap={5}>
                <Text type="danger">注意：原数据会被清除!!!</Text>
                <Text >请选择{title}备份文件</Text>
                <Flex vertical gap={10}>
                    <Input type="file" accept=".gz" onChange={handleFileImport}></Input>
                    <Flex justify="end">
                        <Button type="primary" onClick={confirmFileImport} loading={importLoading}>
                            确定
                        </Button>
                    </Flex>
                </Flex>
            </Flex>
        </Modal>
    </>
}
export default DatabaseBackupRestore;
