import {
  MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE,
  PLATFORM_51JOB,
  PLATFORM_BOSS,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_ZHILIAN,
  PLATFORM_JOBONLINE,
} from '@/common';
import {
  Button,
  Flex,
  Form,
  FormProps,
  Input,
  Radio,
  Select,
  Slider,
  Space,
  Spin,
} from 'antd';
import SubmitButton from '../../../components/SubmitButton';
import { TaskData } from '../../../data/TaskData';

const missionTypes = [
  {
    label: '自动浏览职位搜索页',
    value: MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE,
  },
];

const MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE_OPTIONS = [
  { label: '就业在线', value: PLATFORM_JOBONLINE },
  { label: '前程无忧', value: PLATFORM_51JOB },
  { label: 'BOSS直聘', value: PLATFORM_BOSS },
  { label: '智联招聘', value: PLATFORM_ZHILIAN },
  { label: '拉钩网', value: PLATFORM_LAGOU },
  { label: '猎聘网', value: PLATFORM_LIEPIN },
];

interface TaskEditProps {
  data?: TaskData;
  onSave: (data: TaskData) => void;
}

const TaskEditView: React.FC<TaskEditProps> = ({ data, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);

  const onSaveHandle: FormProps<TaskData>['onFinish'] = async (values) => {
    values.id = data?.id;
    values.type = MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE;
    try {
      setLoading(true);
      await onSave(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Spin spinning={loading} delay={100}>
        <Form
          name="basic"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 800 }}
          initialValues={data}
          onFinish={onSaveHandle}
          autoComplete="off"
          requiredMark
        >
          <Form.Item label="类型" name="type">
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="请选择类型"
              options={missionTypes}
              defaultValue={MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE}
            />
          </Form.Item>
          <Form.Item
            label="运行平台"
            name="platform"
            rules={[{ required: true }]}
          >
            <Radio.Group optionType="button">
              {MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE_OPTIONS.map(
                (item, index) => (
                  <Radio key={index} value={item.value}>
                    {item.label}
                  </Radio>
                )
              )}
            </Radio.Group>
          </Form.Item>
          <Form.Item label="标题" name="name" rules={[{ required: true }]}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="访问地址" name="url" rules={[{ required: true }]}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="翻页延迟时间" name="delay">
            <Slider
              marks={{
                0: '无',
                5: '5秒',
                10: '10秒',
                15: '15秒',
                20: '20秒',
              }}
              tooltip={{
                formatter: (value) => {
                  return value == 0 ? `无` : `${value}秒`;
                },
              }}
              min={0}
              max={20}
            ></Slider>
          </Form.Item>
          <Form.Item label="额外随机时间范围" name="delayRange">
            <Slider
              marks={{
                0: '无',
                5: '5秒',
                10: '10秒',
                15: '15秒',
                20: '20秒',
              }}
              tooltip={{
                formatter: (value) => {
                  return value == 0 ? `无` : `${value}秒`;
                },
              }}
              min={0}
              max={20}
            ></Slider>
          </Form.Item>
          <Form.Item label="最大翻页数" name="maxPage">
            <Slider
              marks={{
                0: '♾️',
                5: '5页',
                10: '10页',
                20: '20页',
                40: '40页',
                80: '80页',
                100: '100页',
              }}
              tooltip={{
                formatter: (value) => {
                  return value == 0 ? `♾️` : `${value}页`;
                },
              }}
              min={0}
              max={100}
            ></Slider>
          </Form.Item>

          <Form.Item label={null}>
            <Flex justify="end">
              <Space>
                <SubmitButton form={form}>保存</SubmitButton>
                <Button htmlType="reset">重置</Button>
              </Space>
            </Flex>
          </Form.Item>
        </Form>
      </Spin>
    </>
  );
};
export default TaskEditView;
