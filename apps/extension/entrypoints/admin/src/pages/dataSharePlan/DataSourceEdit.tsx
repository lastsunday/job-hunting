import { TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD, TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_JOB_TAG_DATA_DOWNLOAD } from "@/common";
import { DataSharePartner } from "@/common/data/domain/dataSharePartner";
import { Flex, Form, FormProps, Input, Select, SelectProps, Space, Spin } from "antd";
import { Switch } from "antd/lib";
import SubmitButton from "../../components/SubmitButton";
export type DataSourceEditProps = {
  data: DataSharePartner,
  onSave: (data: DataSharePartner) => Promise<void>;
  mode?: "add" | "update",
};
const DataSourceEdit: React.FC<DataSourceEditProps> = ({ data, onSave, mode = "update" }) => {

  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const taskTypeOption: SelectProps['options'] = [
    { label: "全部私有数据", value: JSON.stringify({ type: TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD }) },
    { label: "职位(私有数据)", value: JSON.stringify({ type: TASK_TYPE_JOB_DATA_DOWNLOAD }) },
    { label: "公司(私有数据)", value: JSON.stringify({ type: TASK_TYPE_COMPANY_DATA_DOWNLOAD }) },
    { label: "公司标签(私有数据)", value: JSON.stringify({ type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD }) },
    { label: "职位标签(私有数据)", value: JSON.stringify({ type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD }) },
  ];
  const onSaveHandle: FormProps<DataSharePartner>["onFinish"] = async (values) => {
    try {
      setLoading(true);
      const cloneValues = JSON.parse(JSON.stringify(values));
      if (cloneValues.config && cloneValues.config.taskTypeList) {
        cloneValues.config.taskTypeList = cloneValues.config.taskTypeList.map(item => JSON.parse(item));
      }
      await onSave(cloneValues);
    } finally {
      setLoading(false);
    }
  };
  const convertInitValue = (data: DataSharePartner) => {
    const cloneValues = JSON.parse(JSON.stringify(data));
    if (cloneValues.config && cloneValues.config.taskTypeList) {
      cloneValues.config.taskTypeList = cloneValues.config.taskTypeList.map(item => JSON.stringify(item));
    }
    return cloneValues;
  }

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
        initialValues={convertInitValue(data)}
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
          label="仓库类型"
          name="repoType"
          rules={[{ required: true }]}
        >
          <Input disabled></Input>
        </Form.Item>
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
          label="仓库名"
          name="reponame"
          rules={[{ required: true }]}
        >
          <Input></Input>
        </Form.Item>
        <Form.Item
          label="开启"
          name="enable"
          rules={[{ required: true }]}
        >
          <Switch></Switch>
        </Form.Item>

        <Form.Item
          label="数据类型"
          name={["config", "taskTypeList"]}
          rules={[{ required: true }]}
        >
          <Select
            mode="tags"
            allowClear
            placeholder="请选择需要下载的数据类型"
            style={{ width: '100%' }}
            options={taskTypeOption}
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
    </Spin>
  </>
}
export default DataSourceEdit;
