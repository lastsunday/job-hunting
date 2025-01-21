import { CheckCard } from "@ant-design/pro-components";
import { Flex, Form, FormProps, Input, Space, Spin } from "antd";
import SubmitButton from "../../components/SubmitButton";
import { TagEditData } from "../../data/TagEditData";
import { isBlank } from "@/common/utils";

export type TagEditProps = {
    data: TagEditData;
    onSave: (data: TagEditData) => void;
    mode?: "add" | "update",
    validTagName: (value) => Promise<boolean>;
};
const TagEdit: React.FC<TagEditProps> = ({ data, onSave, mode = "update", validTagName }) => {

    const [form] = Form.useForm();
    const [loading, setLoading] = useState<boolean>(false);

    const onSaveHandle: FormProps<TagEditData>["onFinish"] = async (values) => {
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
                    label="名称"
                    name="tagName"
                    rules={[{ required: true },
                    ({ getFieldValue }) => ({
                        async validator(_, value) {
                            if (mode == "update" || isBlank(value) || await validTagName(value)) {
                                return Promise.resolve();
                            } else {
                                return Promise.reject(new Error('标签已存在'));
                            }
                        },
                    }),
                    ]}
                >
                    <Input disabled={mode == "update"}></Input>
                </Form.Item>
                <Form.Item
                    label="标签私密性"
                    name="isPublic"
                    rules={[{ required: true }]}
                >
                    <CheckCard.Group>
                        <CheckCard title="公开" description="公开该标签，标签与数据的关系将被上传" value={true} />
                        <CheckCard title="私有" description="该标签为私有，标签与数据的关系不会上传" value={false} />
                    </CheckCard.Group>
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
export default TagEdit;
