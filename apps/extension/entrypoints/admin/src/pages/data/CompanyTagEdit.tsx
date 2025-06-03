import { Flex, Form, FormProps, Input, Select, Space, Spin } from "antd";
import SubmitButton from "../../components/SubmitButton";
import { CompanyTagEditData } from "../../data/CompanyTagEditData";
import { WhitelistData } from "../../data/WhitelistData";
import { isBlank } from "@/common/utils";

export type CompanyTagEditProps = {
  data: CompanyTagEditData;
  whitelist?: WhitelistData[];
  getWhitelistFunction?: () => Promise<WhitelistData[]>;
  onSave: (data: CompanyTagEditData) => void;
  mode?: "add" | "update",
  validCompanyName: (value) => Promise<boolean>;
};
const CompanyTagEdit: React.FC<CompanyTagEditProps> = ({ data, whitelist, getWhitelistFunction, onSave, mode = "update", validCompanyName }) => {

  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [allTag, setAllTag] = useState([]);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (whitelist) {
        setAllTag(whitelist);
      } else {
        getWhitelistFunction ? setAllTag(await getWhitelistFunction()) : null;
      }
    })();
  }, []);

  const onSaveHandle: FormProps<CompanyTagEditData>["onFinish"] = async (values) => {
    try {
      setLoading(true);
      setSaveLoading(true);
      await onSave(values);
    } finally {
      setLoading(false);
      setSaveLoading(false);
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
          label="公司名"
          name="name"
          rules={[{ required: true },
          ({ getFieldValue }) => ({
            async validator(_, value) {
              if (mode == "update" || isBlank(value) || await validCompanyName(value)) {
                return Promise.resolve();
              } else {
                return Promise.reject(new Error('公司名已存在'));
              }
            },
          }),
          ]}
        >
          <Input disabled={mode == "update"}></Input>
        </Form.Item>
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
            options={allTag}
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
export default CompanyTagEdit;
