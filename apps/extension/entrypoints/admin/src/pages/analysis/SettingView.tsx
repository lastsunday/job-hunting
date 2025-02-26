import MarkdownEditor from '@uiw/react-markdown-editor';
import {
  Button,
  Col,
  Divider,
  Form,
  FormProps,
  Input,
  message,
  Radio,
  Row,
  Spin,
  Steps,
  Switch,
} from 'antd';
import React, { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import SubmitButton from '../../components/SubmitButton';
import { Source, useAnalysis } from '../../hooks/analysis';
import useAnalysisStore from '../../store/AnalysisStore';
import { errorLog } from '@/common/log';

const SettingView: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const source = Form.useWatch('source', form);
  const [markdown, setMarkdown] = useState('');
  const [config, update] = useAnalysisStore(
    useShallow((state) => [state.config, state.update])
  );
  const [loading, setLoading] = useState(false);

  const onChange = (value: number) => {
    setCurrent(value);
  };

  const next = () => {
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const { getLabelBySource } = useAnalysis();

  type FieldType = {
    source: Source;
    url?: string;
    model?: string;
    token?: string;
    resume?: string;
    autoAnalysisToSeachPage?: boolean;
  };

  const SOURCE_OPTIONS = [];

  const sourceKeys = Object.keys(Source);

  sourceKeys.forEach((key: string) => {
    SOURCE_OPTIONS.push({
      label: getLabelBySource(key),
      value: key,
    });
  });

  const sourceData = {
    OLLAMA: {
      url: { rules: { required: false }, default: 'http://localhost:11434' },
      model: { rules: { required: false }, default: 'deepseek-r1:7b' },
      token: { rules: { required: false }, default: '' },
    },
    SILICONFLOW: {
      url: {
        rules: { required: false },
        default: 'https://api.siliconflow.cn',
      },
      model: {
        rules: { required: false },
        default: 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
      },
      token: { rules: { required: true }, default: '' },
    },
  };

  const defaultResume = `## 个人信息
- 学历：本科
- 工作经验：5年

## 专业技能
- （掌握）编程语言：Java、Javascript、Typescript、HTML、CSS、Dart
- （掌握）后端开发技术：Spring Boot，Spring Cloud、Spring Cloud Alibaba、Hibernate、MyBatisPlus
- （掌握）中间件技术：Nginx、MySQL、PostgreSQL、Sqlite、Redis、ElasticSearch、RabbitMQ、Flink、Minio、Fastdfs、Nacos
- （掌握）Web前端技术：VueJs、Angular、ReactJS、GWT、JQuery、Chrome Extension
- （了解）GIS技术：Leaflet、Maplibre、Cesium、Mars3d、SuperMap
- （掌握）移动端和跨平台技术：Android、IOS、微信小程序、Cordova、Flutter、UniApp、ElectronJS
- （掌握）源代码与项目管理：CVS、SVN、Git、Gitlab、Gitea、Gitlab FLow、Maven、Gradle
- （掌握）DevOps开发运维：能独立搭建私有的Docker, Jenkins, Gitlab, Nexus, Harbor、SonarQube
- （了解）云平台K8S：蓝鲸K8s、K3s、Autok3s、云服务器 ECS
- （掌握）基础运维技术: Linux服务器基本命令，配置管理、性能调优

## 工作经验
- **职位猎人有限公司**  2019.11-2024.11
- **职位**：高级Java工程师`;

  const steps = [
    [
      <Col key={0}>
        <Form.Item<FieldType>
          label="人工智能厂商"
          name="source"
          initialValue={Source.OLLAMA}
          rules={[{ required: true }]}
        >
          <Radio.Group optionType="button">
            {SOURCE_OPTIONS.map((item, index) => (
              <Radio key={index} value={item.value}>
                {item.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item<FieldType>
          label="访问地址"
          name="url"
          rules={[
            {
              ...sourceData[source ?? Source.OLLAMA]['url'].rules,
              message: '请输入访问地址',
            },
          ]}
        >
          <Input
            allowClear
            placeholder={sourceData[source ?? Source.OLLAMA]['url'].default}
          />
        </Form.Item>
        <Form.Item<FieldType>
          label="模型名称"
          name="model"
          rules={[
            {
              ...sourceData[source ?? Source.OLLAMA]['model'].rules,
              message: '请输入模型名称',
            },
          ]}
        >
          <Input
            allowClear
            placeholder={sourceData[source ?? Source.OLLAMA]['model'].default}
          />
        </Form.Item>
        <Form.Item<FieldType>
          label="令牌(API Key)"
          name="token"
          rules={[
            {
              ...sourceData[source ?? Source.OLLAMA]['token'].rules,
              message: '请输入令牌',
            },
          ]}
        >
          <Input.Password
            allowClear
            placeholder={sourceData[source ?? Source.OLLAMA]['token'].default}
          />
        </Form.Item>
      </Col>,
    ],
    [
      <Col key={1}>
        <Form.Item<FieldType>
          label="个人简历"
          name="resume"
          initialValue={defaultResume}
          rules={[
            {
              required: true,
              message: '请填写个人简历',
            },
          ]}
        >
          <MarkdownEditor
            value={markdown}
            height="400px"
            onChange={(value, viewUpdate) =>
              form.setFieldValue('resume', value)
            }
          />
        </Form.Item>
      </Col>,
    ],
    [
      <Col key={2}>
        <Form.Item<FieldType>
          name="autoAnalysisToSeachPage"
          label="招聘网站搜索页"
        >
          <Switch
            checkedChildren="开启自动职位分析"
            unCheckedChildren="关闭自动职位分析"
          />
        </Form.Item>
      </Col>,
    ],
  ];

  const allSetps = [...steps, steps.flatMap((item) => item)];

  useEffect(() => {
    const init = async () => {
      form.setFieldsValue(config);
    };
    init();
  }, []);

  const onSaveHandle: FormProps<FieldType>['onFinish'] = async (values) => {
    try {
      setLoading(true);
      const result = Object.assign(config, values);
      await update(result);
      messageApi.open({
        type: 'success',
        content: '保存职位分析设置成功',
      });
    } catch (e) {
      errorLog(e);
      messageApi.open({
        type: 'error',
        content: `保存职位分析设置失败,${e}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    form.resetFields();
  };

  return (
    <Col>
      {contextHolder}
      <Spin spinning={loading}>
        <Form
          name="basic"
          layout="vertical"
          form={form}
          onFinish={onSaveHandle}
        >
          <Row>
            <Steps
              current={current}
              onChange={onChange}
              items={[
                {
                  title: '人工智能服务配置',
                  description: `填写人工智能服务配置，以调用人工智能能力`,
                },
                {
                  title: '填写简历',
                  description: `填写简历以作为职位分析的参考依据`,
                },
                {
                  title: '页面配置',
                  description: `进行插件运行页面配置，使职位分析在页面生效`,
                },
                {
                  title: '确认',
                  description: `确认及保存职位分析配置，使其生效`,
                },
              ]}
            />
          </Row>
          <Row>
            <Divider></Divider>
          </Row>
          <Row justify="end">
            <Button
              style={{ margin: '0 8px 0 0' }}
              type="dashed"
              htmlType="button"
              onClick={onReset}
            >
              重置
            </Button>
            {current > 0 && (
              <Button style={{ margin: '0 8px 0 0' }} onClick={() => prev()}>
                上一步
              </Button>
            )}
            {current < allSetps.length - 1 && (
              <Button type="primary" onClick={() => next()}>
                下一步
              </Button>
            )}
            {current === allSetps.length - 1 && (
              <Form.Item label={null}>
                <SubmitButton form={form}>完成</SubmitButton>
              </Form.Item>
            )}
          </Row>
          <Row>
            <Col flex={1}>{allSetps[current]}</Col>
          </Row>
        </Form>
      </Spin>
    </Col>
  );
};

export default SettingView;
