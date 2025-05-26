import { DataSourceMetadata, TYPE_GITHUB_GRAPHQL_SEARCH_REPO, TYPE_GIT_METADATA } from "@/common/data/domain/dataSourceMetadata";
import { Flex, Form, FormProps, Input, Select, SelectProps, Space, Spin } from "antd";
import { Switch } from "antd/lib";
import SubmitButton from "../../components/SubmitButton";
import CodeMirror from '@uiw/react-codemirror';
import { langs } from '@uiw/codemirror-extensions-langs';
import { clone, toJSON } from "@/common/utils";
export type DataSourceMetadataEditProps = {
  data: DataSourceMetadata,
  onSave: (data: DataSourceMetadata) => Promise<void>;
  mode?: "add" | "update",
};
const DataSourceMetadataEditView: React.FC<DataSourceMetadataEditProps> = ({ data, onSave, mode = "update" }) => {

  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const typeOption: SelectProps['options'] = [
    { label: "Github", value: TYPE_GITHUB_GRAPHQL_SEARCH_REPO },
    { label: "Git", value: TYPE_GIT_METADATA },
  ];
  const onSaveHandle: FormProps<DataSourceMetadata>["onFinish"] = async (values) => {
    try {
      setLoading(true);
      const cloneValues = clone(values);
      cloneValues.config = toJSON(cloneValues.config);
      cloneValues.data = toJSON(cloneValues.data);
      await onSave(cloneValues);
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
        initialValues={data}
        labelCol={{ span: 4 }}
      >
        {mode == "update" ? <Form.Item
          label="编号"
          name="id"
        >
          <Input disabled={mode == "update"}></Input>
        </Form.Item>
          : null}
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true }]}
        >
          <Input></Input>
        </Form.Item>
        {
          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: false }]}
          >
            <Input></Input>
          </Form.Item>
        }
        <Form.Item
          label="图标"
          name="icon"
          rules={[{ required: false }]}
        >
          <Input></Input>
        </Form.Item>
        <Form.Item
          label="类型"
          name={["type"]}
          rules={[{ required: true }]}
        >
          <Select
            allowClear
            placeholder="请选择类型"
            style={{ width: '100%' }}
            options={typeOption}
          />
        </Form.Item>
        <Form.Item
          label="配置"
          name="config"
          rules={[{ required: true },
          ({ getFieldValue }) => ({
            validator(_, value) {
              try {
                JSON.parse(value);
                return Promise.resolve();
              } catch (e) {
                return Promise.reject(new Error('不是合法的JSON对象'));
              }
            },
          }),
          ]}
        >
          <CodeMirror
            key="config"
            basicSetup={{ autocompletion: true }}
            extensions={[langs.json()]}
            style={{ width: '100%' }}
            height="200px"
          />
        </Form.Item>
        <Form.Item
          label="数据"
          name="data"
          rules={[{ required: false },
          ({ getFieldValue }) => ({
            validator(_, value) {
              try {
                JSON.parse(value);
                return Promise.resolve();
              } catch (e) {
                return Promise.reject(new Error('不是合法的JSON对象'));
              }
            },
          }),
          ]}
        >
          <CodeMirror
            key="data"
            basicSetup={{ autocompletion: true }}
            extensions={[langs.json()]}
            style={{ width: '100%' }}
            height="200px"
          />
        </Form.Item>
        <Form.Item
          label="自动更新"
          name="autoUpdateEnable"
          rules={[{ required: true }]}
        >
          <Switch></Switch>
        </Form.Item>
        <Form.Item
          label="排列序号"
          name="seq"
          rules={[{ required: false }]}
        >
          <Input type="number"></Input>
        </Form.Item>
        <Form.Item
          label="启用状态"
          name="enable"
          rules={[{ required: true }]}
        >
          <Switch></Switch>
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
export default DataSourceMetadataEditView;
