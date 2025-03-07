import MarkdownEditor from '@uiw/react-markdown-editor';
import {
  Alert,
  Button,
  Col,
  Divider,
  Form,
  FormProps,
  Input,
  message,
  Radio,
  Row,
  Select,
  SelectProps,
  Spin,
  Steps,
} from 'antd';
import React, { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import SubmitButton from '../../components/SubmitButton';
import { Page, Source, useAnalysis } from '../../hooks/analysis';

const { getLabelBySource, getLableByPage } = useAnalysis();
import useAnalysisStore from '../../store/AnalysisStore';
import { errorLog } from '@/common/log';
import Markdown from 'marked-react';

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

  type FieldType = {
    source: Source;
    url?: string;
    model?: string;
    token?: string;
    resume?: string;
    autoAnalysisPages?: Array<Page>;
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
    OPENAI: {
      url: {
        rules: { required: false },
        default: 'http://127.0.0.1:1234',
      },
      model: {
        rules: { required: false },
        default: 'mradermacher/DeepSeek-R1-Distill-Llama-8B-Abliterated-GGUF',
      },
      token: { rules: { required: false }, default: '' },
      info: (
        <Alert
          message={getLabelBySource(source ?? Source.OPENAI)}
          description=<Markdown>
            {`OpenAI兼容协议，符合[OpenAI接口协议](https://platform.openai.com/docs/api-reference/chat)的都支持。
### 注意事项

- 可使用本地部署工具，如[LM Studio](https://lmstudio.ai/)

- 使用外部服务时注意敏感信息的泄漏，如[OpenAI](https://openai.com/)

LM Studio安装和使用请见 [LM Studio](https://lmstudio.ai/)，下面是简要步骤：

- 从[LM Studio](https://lmstudio.ai/)下载lmstudio并安装
- 打开后，在窗体最下面找到UI切换按钮，切换到Developer模式的UI
- 切换到Discover菜单，查找并下载模型，如 **mradermacher/DeepSeek-R1-Distill-Llama-8B-Abliterated-GGUF**
- 切换到Developer菜单，启动服务器（在上方的 **Status:** 字样旁边的按钮）
- 点击 **Settings** 按钮 -> 打开 **Enable CORS** 选项 
- 启动后可以看到右边的访问地址

            `}
          </Markdown>
          type="warning"
          showIcon
        />
      ),
    },
    OLLAMA: {
      url: { rules: { required: false }, default: 'http://localhost:11434' },
      model: { rules: { required: false }, default: 'deepseek-r1:7b' },
      token: { rules: { required: false }, default: '' },
      info: (
        <Alert
          message={getLabelBySource(source ?? Source.OLLAMA)}
          description=<Markdown>
            {`可本地部署的大模型工具。
              
安装详情请访问 [ollama官网](https://ollama.com/)

服务器启动步骤（以Window为例）

  1. 执行跨域配置
      \`\`\`shell
      set OLLAMA_ORIGINS=*
      \`\`\`
  2. 启动ollama服务器
      \`\`\`shell
      ollama serve
      \`\`\`
`}
          </Markdown>
          type="info"
          showIcon
        />
      ),
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
      info: (
        <Alert
          message={getLabelBySource(source ?? Source.SILICONFLOW)}
          description=<Markdown>
            {`（注意敏感信息的泄漏）第三方大模型接口。
              
模型名称，令牌的获取请访问 [硅基流动用户手册](https://docs.siliconflow.cn/cn/userguide/quickstart)`}
          </Markdown>
          type="warning"
          showIcon
        />
      ),
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

  const autoAnalysisPageOption: SelectProps['options'] = [];

  Object.keys(Page).forEach((key: string) => {
    autoAnalysisPageOption.push({
      label: getLableByPage(key),
      value: key,
    });
  });

  const steps = [
    [
      <Col key={0}>
        <Form.Item<FieldType>
          label="人工智能厂商"
          name="source"
          initialValue={Source.OPENAI}
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
        {sourceData[source ?? Source.OPENAI]['info']}
        <Form.Item<FieldType>
          label="访问地址"
          name="url"
          rules={[
            {
              ...sourceData[source ?? Source.OPENAI]['url'].rules,
              message: '请输入访问地址',
            },
          ]}
        >
          <Input
            allowClear
            placeholder={sourceData[source ?? Source.OPENAI]['url'].default}
          />
        </Form.Item>
        <Form.Item<FieldType>
          label="模型名称"
          name="model"
          rules={[
            {
              ...sourceData[source ?? Source.OPENAI]['model'].rules,
              message: '请输入模型名称',
            },
          ]}
        >
          <Input
            allowClear
            placeholder={sourceData[source ?? Source.OPENAI]['model'].default}
          />
        </Form.Item>
        <Form.Item<FieldType>
          label="令牌(API Key)"
          name="token"
          rules={[
            {
              ...sourceData[source ?? Source.OPENAI]['token'].rules,
              message: '请输入令牌',
            },
          ]}
        >
          <Input.Password
            allowClear
            placeholder={sourceData[source ?? Source.OPENAI]['token'].default}
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
        <Form.Item<FieldType> name="autoAnalysisPages" label="自动分析职位页面">
          <Select
            mode="tags"
            allowClear
            placeholder="请选择要开启自动分析的页面"
            style={{ width: '100%' }}
            options={autoAnalysisPageOption}
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
                  description: `进行插件运行页面配置，使职位分析设置在页面生效`,
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
