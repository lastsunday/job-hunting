import { Flex, Form, FormProps, Input, Select, Space, Spin } from "antd";
import SubmitButton from "../../components/SubmitButton";
import { JobTagEditData } from "../../data/JobTagEditData";
import { WhitelistData } from "../../data/WhitelistData";
import { isBlank } from "@/common/utils";

export type JobTagEditProps = {
    data: JobTagEditData;
    whitelist?: WhitelistData[];
    onSave: (data: JobTagEditData) => void;
    mode?: "add" | "update",
    validJobId: (value) => Promise<boolean>;
};
const JobTagEdit: React.FC<JobTagEditProps> = ({ data, whitelist, onSave, mode = "update", validJobId }) => {

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
                <Form.Item
                    label="职位编号"
                    name="id"
                    rules={[{ required: true },
                    ({ getFieldValue }) => ({
                        async validator(_, value) {
                            if (mode == "update" || isBlank(value) || await validJobId(value)) {
                                return Promise.resolve();
                            } else {
                                return Promise.reject(new Error('职位已存在'));
                            }
                        },
                    }),
                    ]}
                >
                    <Input disabled={mode == "update"}></Input>
                </Form.Item>
                {
                    mode == "update" ? <Form.Item
                        label="职位名"
                        name="name"
                    >
                        <Input disabled></Input>
                    </Form.Item> : null
                }
                <Form.Item
                    label="标签"
                    name="tags"
                    rules={[{ required: mode == "add" }]}
                >
                    <Select
                        allowClear
                        mode="tags"
                        style={{ width: "100%" }}
                        placeholder="请输入标签"
                        options={whitelist}
                    />
                </Form.Item>

                <Form.Item label={null}>
                    <Flex justify="end">
                        <Space>
                            <SubmitButton form={form}>保存</SubmitButton>
                        </Space>
                    </Flex>
                </Form.Item>
            </Form>
        </Spin >
    </>
}
export default JobTagEdit;
