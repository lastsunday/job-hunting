import { DataShareDataSourceEdit } from "@/common/data/domain/dataShareDataSourceEdit";
import { Flex, Form, FormProps, Input, Space, Spin } from "antd";
import SubmitButton from "../../components/SubmitButton";
import { JobTagEditData } from "../../data/JobTagEditData";

export type DataSourceEditProps = {
    data: DataShareDataSourceEdit;
    onSave: (data: JobTagEditData) => void;
    mode?: "add" | "update",
};
const DataSourceEdit: React.FC<DataSourceEditProps> = ({ data, onSave, mode = "update" }) => {

    const [form] = Form.useForm();
    const [loading, setLoading] = useState<boolean>(false);

    const onSaveHandle: FormProps<JobTagEditData>["onFinish"] = async (values) => {
        try {
            setLoading(true);
            await onSave(values);
        } finally {
            setLoading(false);
        }
    };

    return <>
        <Spin
            spinning={loading}
            delay={100}
        >
            <Form
                name="basic"
                onFinish={onSaveHandle}
                autoComplete="off"
                requiredMark
                layout="vertical"
                initialValues={data}
            >
                {mode == "update" ? <Form.Item
                    label="编号"
                    name="id"
                >
                    <Input disabled={mode == "update"}></Input>
                </Form.Item>
                    : null}
                {
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[{ required: true }]}
                    >
                        <Input disabled={mode == "update"}></Input>
                    </Form.Item>
                }
                <Form.Item
                    label="仓库类型"
                    name="repoType"
                    rules={[{ required: true }]}
                >
                    <Input disabled></Input>
                </Form.Item>
                <Form.Item
                    label="仓库名"
                    name="reponame"
                    rules={[{ required: true }]}
                >
                    <Input></Input>
                </Form.Item>
                <Form.Item label={null}>
                    <Flex justify="end">
                        <Space>
                            <SubmitButton form={form}>保存</SubmitButton>
                        </Space>
                    </Flex>
                </Form.Item>
            </Form>
        </Spin>
    </>
}
export default DataSourceEdit;
