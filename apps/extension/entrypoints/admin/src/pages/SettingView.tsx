import { DATA_TYPE_NAME_JOB_SNAPSHOT } from '@/common';
import {
  APP_ID,
  COMPANY_MAX_EXPORT_SIZE,
  COMPANY_TAG_MAX_EXPORT_SIZE,
  JOB_MAX_EXPORT_SIZE,
  JOB_PUBLIC_MAX_EXPORT_SIZE,
  JOB_SNAPSHOT_MAX_EXPORT_SIZE,
  JOB_TAG_MAX_EXPORT_SIZE,
} from '@/common/config';
import { CheckCard } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Flex,
  Form,
  message,
  Modal,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import Markdown from 'marked-react';
import React from 'react';
import { useShallow } from 'zustand/shallow';
import { useData } from '../hooks/data';
import useAnalysisStore from '../store/AnalysisStore';
import useAuthStore from '../store/AuthStore';
import useDataSharePlanStore from '../store/DataSharePlanStore';
import useSystemStore from '../store/SystemStore';
import DataBackupRestore from './setting/DataBackupRestore';
import DatabaseBackupRestore from './setting/DatabaseBackupRestore';
import useJobSnapshotStore from '../store/JobSnapshotStore';
const { Text, Link } = Typography;

const version = __APP_VERSION__;

const SettingView: React.FC = () => {
  const [
    enable,
    change,
    privateDataSyncEnableConfig,
    updatePrivateDataSyncEnableConfig,
    enablePublic,
    changePublic,
    publicDataSyncEnableConfig,
    updatePublicDataSyncEnableConfig,
  ] = useDataSharePlanStore(
    useShallow((state) => [
      state.enable,
      state.change,
      state.privateDataSyncEnableConfig,
      state.updatePrivateDataSyncEnableConfig,
      state.enablePublic,
      state.changePublic,
      state.publicDataSyncEnableConfig,
      state.updatePublicDataSyncEnableConfig,
    ])
  );
  const [
    updateDataSyncEnableConfigLoading,
    setUpdateDataSyncEnableConfigLoading,
  ] = useState(false);
  const [analysisConfig, updateAnalysis] = useAnalysisStore(
    useShallow((state) => [state.config, state.update])
  );
  const [installAndLogin] = useAuthStore(
    useShallow((state) => [state.installAndLogin])
  );
  const [dataSharePlanEnable, setDataSharePlanEnable] = useState(false);
  const [dataPublicEnable, setDataPublicEnable] = useState(false);
  const [analysisEnable, setAnalysisEnable] = useState(false);
  const [jobSnapshotEnable, setJobSnapshotEnable] = useState(false);
  const [jobSnapshotConfig, updateJobSnapshotConfig] = useJobSnapshotStore(
    useShallow((state) => [state.config, state.update])
  );
  const {
    getJobDataToExcelJsonArray,
    getJobDataTotal,
    saveJobData,
    getJobPublicDataToExcelJsonArray,
    getJobPublicDataTotal,
    saveJobPublicData,
    getCompanyDataToExcelJsonArray,
    getCompanyDataTotal,
    saveCompanyData,
    getCompanyTagDataToExcelJsonArray,
    saveCompanyTagData,
    getCompanyTagDataTotal,
    getJobTagDataToExcelJsonArray,
    saveJobTagData,
    getJobTagDataTotal,
    JOB_FILE_HEADER,
    JOB_PUBLIC_FILE_HEADER,
    COMPANY_FILE_HEADER,
    COMPANY_TAG_FILE_HEADER,
    JOB_TAG_FILE_HEADER,
    JOB_SNAPSHOT_FILE_HEADER,
    saveJobSnapshotData,
    getJobSnapshotDataTotal,
    getJobSnapshotDataToJsonArray,
  } = useData();
  const [isHowToUpdateModalOpen, setIsHowToUpdateModalOpen] = useState(false);
  const [isVersionDescModalOpen, setIsVersionDescModalOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isStatementOfTermsModalOpen, setIsStatementOfTermsModalOpen] =
    useState(false);
  const [licenseContent, setLicenseContent] = useState('');
  const [statementOfTerms, setStatementOfTerms] = useState('');
  const [versionChecking, setVersionChecking] = useState(false);
  const [checkingVersionText, setCheckingVersionText] = useState('');
  const [
    isLatestChangelogContentModalOpen,
    setIsLatestChangelogContentModalOpen,
  ] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [refreshCheckVersion, setRefreshCheckVersion] = useState(false);
  const [
    versionObject,
    newVersion,
    latestVersion,
    latestVersionCreatedAt,
    latestChangelogContent,
    query,
    downloadLatest,
  ] = useSystemStore(
    useShallow((state) => [
      state.versionObject,
      state.newVersion,
      state.latestVersion,
      state.latestVersionCreatedAt,
      state.latestChangelogContent,
      state.query,
      state.downloadLatest,
    ])
  );
  const private_data_setting = [
    { label: '职位数据', name: 'job', value: false, header: JOB_FILE_HEADER },
    {
      label: '公司数据',
      name: 'company',
      header: COMPANY_FILE_HEADER,
    },
    {
      label: '职位标签数据',
      name: 'jobTag',
      header: JOB_TAG_FILE_HEADER,
    },
    {
      label: '公司标签数据',
      name: 'companyTag',
      header: COMPANY_TAG_FILE_HEADER,
    },
  ];

  const [privateDataSettingForm] = Form.useForm();

  const public_data_setting = [
    { label: '职位公开数据', name: 'jobPublic', value: false, header: JOB_PUBLIC_FILE_HEADER },
  ];

  const [publicDataSettingForm] = Form.useForm();


  useEffect(() => {
    setDataSharePlanEnable(enable);
    setDataPublicEnable(enablePublic);
    setAnalysisEnable(analysisConfig.enable);
    setJobSnapshotEnable(jobSnapshotConfig.enable);
  }, []);

  useEffect(() => {
    onCheckVersion();
  }, [refreshCheckVersion]);

  const onCheckVersion = async () => {
    setVersionChecking(true);
    setCheckingVersionText('正检查新版本');
    try {
      await query();
      setCheckingVersionText('已是最新版本，点击再检查');
      setVersionChecking(false);
    } catch (e) {
      setCheckingVersionText('版本检查失败，请点击再次检查');
    }
  };

  return (
    <>
      {contextHolder}
      <Flex gap="small" wrap vertical>
        <Card title="程序信息" variant="borderless" size="small">
          <Flex gap={10} vertical>
            <Flex gap={10}>
              <Text type="success">版本 {version}</Text>
              {versionChecking ? (
                <Text type="secondary">{checkingVersionText}</Text>
              ) : (
                <>
                  {newVersion ? (
                    <Flex gap={10}>
                      <Text type="warning">
                        发现新版本[{latestVersion}]{latestVersionCreatedAt}
                      </Text>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => {
                          setIsLatestChangelogContentModalOpen(true);
                        }}
                      >
                        查看新版本详情
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => {
                          try {
                            downloadLatest(versionObject);
                          } catch (e) {
                            messageApi.error(e.message);
                          }
                        }}
                      >
                        <div className="i-mdi:download" />
                        下载新版本
                      </Button>
                    </Flex>
                  ) : (
                    <Text
                      type="success"
                      onClick={() => {
                        setRefreshCheckVersion(!refreshCheckVersion);
                      }}
                    >
                      已是最新版本
                    </Text>
                  )}
                </>
              )}
            </Flex>
            <Flex gap={5}>
              <Button
                onClick={() => {
                  setIsHowToUpdateModalOpen(true);
                }}
              >
                如何更新程序版本
                <div className="i-ph:question" />
              </Button>
              <Button
                onClick={async () => {
                  const changelogUrl = chrome.runtime.getURL('CHANGELOG.md');
                  setChangelogContent(await (await fetch(changelogUrl)).text());
                  setIsVersionDescModalOpen(true);
                }}
              >
                版本说明
              </Button>
              <Button
                onClick={async () => {
                  const licenseUrl = chrome.runtime.getURL('LICENSE');
                  setLicenseContent(await (await fetch(licenseUrl)).text());
                  setIsLicenseModalOpen(true);
                }}
              >
                许可证
              </Button>
              <Button
                onClick={async () => {
                  setStatementOfTerms(`
# 免责声明

## 1. 项目目的与性质
本项目（以下简称“本项目”）是作为一个技术研究与学习工具而创建的，旨在探索和学习网络数据采集技术。本项目专注于招聘平台的数据爬取与分析技术研究，旨在提供给学习者和研究者作为技术交流之用。

## 2. 法律合规性声明
本项目开发者（以下简称“开发者”）郑重提醒用户在下载、安装和使用本项目时，严格遵守中华人民共和国相关法律法规，包括但不限于《中华人民共和国网络安全法》、《中华人民共和国反间谍法》等所有适用的国家法律和政策。用户应自行承担一切因使用本项目而可能引起的法律责任。

## 3. 使用目的限制
本项目严禁用于任何非法目的或非学习、非研究的商业行为。本项目不得用于任何形式的非法侵入他人计算机系统，不得用于任何侵犯他人知识产权或其他合法权益的行为。用户应保证其使用本项目的目的纯属个人学习和技术研究，不得用于任何形式的非法活动。

## 4. 免责声明
开发者已尽最大努力确保本项目的正当性及安全性，但不对用户使用本项目可能引起的任何形式的直接或间接损失承担责任。包括但不限于由于使用本项目而导致的任何数据丢失、设备损坏、法律诉讼等。

## 5. 知识产权声明
本项目的知识产权归开发者所有。本项目受到著作权法和国际著作权条约以及其他知识产权法律和条约的保护。用户在遵守本声明及相关法律法规的前提下，可以下载和使用本项目。

## 6. 最终解释权
关于本项目的最终解释权归开发者所有。开发者保留随时更改或更新本免责声明的权利，恕不另行通知。
                    `);
                  setIsStatementOfTermsModalOpen(true);
                }}
              >
                免责声明
              </Button>
              <Button
                onClick={async () => {
                  const packageUrl = chrome.runtime.getURL('package.json');
                  const packageObject = await (await fetch(packageUrl)).json();
                  window.open(packageObject.homepage);
                }}
              >
                访问主页
              </Button>
              <Button
                onClick={async () => {
                  const packageUrl = chrome.runtime.getURL('package.json');
                  const packageObject = await (await fetch(packageUrl)).json();
                  window.open(packageObject.bugs);
                }}
              >
                问题反馈
              </Button>
            </Flex>
          </Flex>
        </Card>
        <Card title="GitHub App" variant="borderless" size="small">
          <Flex vertical gap={5}>
            <Flex>
              <Tooltip title="安装GitHubApp获得评论、数据云备份和分享的能力">
                <Button
                  onClick={() => {
                    installAndLogin();
                  }}
                  icon=<div className="i-mdi:github" />
                >
                  安装GitHubApp并登录
                </Button>
              </Tooltip>
            </Flex>
            <Flex gap={5}>
              <Text type="warning">注意：Github App要求的授权：</Text>
              <Link
                target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-administration"
              >
                Administration
                <div className="i-mingcute:warning-line inline-flex" />
              </Link>
              <Link
                target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-issues"
              >
                Issues
                <div className="i-mingcute:warning-line inline-flex" />
              </Link>
              <Link
                target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-contents"
              >
                Contents
                <div className="i-mingcute:warning-line inline-flex" />
              </Link>
              <Link
                target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-metadata"
              >
                Metadata
                <div className="i-mingcute:warning-line inline-flex" />
              </Link>
            </Flex>
          </Flex>
        </Card>
        <Card title="职位分析" variant="borderless" size="small">
          <CheckCard.Group
            onChange={async (value) => {
              if (value) {
                analysisConfig.enable = true;
                await updateAnalysis(analysisConfig);
                setAnalysisEnable(true);
              } else {
                analysisConfig.enable = false;
                await updateAnalysis(analysisConfig);
                setAnalysisEnable(false);
              }
            }}
            value={analysisEnable}
          >
            <CheckCard title="开启" description="开启职位分析" value={true} />
            <CheckCard title="关闭" description="关闭职位分析" value={false} />
          </CheckCard.Group>
        </Card>
        <Card title="职位快照" variant="borderless" size="small">
          <CheckCard.Group
            onChange={async (value) => {
              if (value) {
                jobSnapshotConfig.enable = true;
                await updateJobSnapshotConfig(jobSnapshotConfig);
                setJobSnapshotEnable(true);
              } else {
                jobSnapshotConfig.enable = false;
                await updateJobSnapshotConfig(jobSnapshotConfig);
                setJobSnapshotEnable(false);
              }
            }}
            value={jobSnapshotEnable}
          >
            <CheckCard title="开启" description="开启职位快照" value={true} />
            <CheckCard title="关闭" description="关闭职位快照" value={false} />
          </CheckCard.Group>
        </Card>
        <Card
          title=<Flex align="center" gap={5}>
            <Text>数据云备份和分享</Text>
          </Flex>
          variant="borderless"
          size="small"
        >
          <Spin spinning={updateDataSyncEnableConfigLoading}>
            <Card
              title=<Flex align="center" gap={5}>
                <Text>私有数据</Text>
                <Switch
                  checkedChildren="私有数据云备份开启"
                  unCheckedChildren="私有数据云备份关闭"
                  size="small"
                  checked={dataSharePlanEnable}
                  onChange={async (checked) => {
                    try {
                      setUpdateDataSyncEnableConfigLoading(true);
                      if (checked) {
                        await change(true);
                        setDataSharePlanEnable(true);
                      } else {
                        await change(false);
                        setDataSharePlanEnable(false);
                      }
                    } finally {
                      setUpdateDataSyncEnableConfigLoading(false);
                    }
                  }}
                ></Switch>
              </Flex>
              variant="borderless"
              size="small"
            >
              <Form
                form={privateDataSettingForm}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 14 }}
                layout="horizontal"
                disabled={!dataSharePlanEnable}
                initialValues={privateDataSyncEnableConfig}
              >
                {private_data_setting.map((item) => {
                  return (
                    <Form.Item
                      key={item.name}
                      label={item.label}
                      name={item.name}
                      tooltip={{
                        color: 'white',
                        placement: 'right',
                        title: (
                          <Flex wrap gap={3}>
                            {item.header[item.header.length - 1].map((name) => {
                              return (
                                <Tag
                                  key={`${item.name}${name}`}
                                  color="magenta"
                                >
                                  {name}
                                </Tag>
                              );
                            })}
                          </Flex>
                        ),
                      }}
                    >
                      <Switch
                        onChange={async () => {
                          try {
                            setUpdateDataSyncEnableConfigLoading(true);
                            await updatePrivateDataSyncEnableConfig(
                              privateDataSettingForm.getFieldsValue()
                            );
                          } finally {
                            setUpdateDataSyncEnableConfigLoading(false);
                          }
                        }}
                      ></Switch>
                    </Form.Item>
                  );
                })}
              </Form>
            </Card>
            <Card
              title=<Flex align="center" gap={5}>
                <Text>公开数据</Text>
                <Switch
                  checkedChildren="公开数据共享开启"
                  unCheckedChildren="公开数据共享关闭"
                  size="small"
                  checked={dataPublicEnable}
                  onChange={async (checked) => {
                    try {
                      setUpdateDataSyncEnableConfigLoading(true);
                      if (checked) {
                        await changePublic(true);
                        setDataPublicEnable(true);
                      } else {
                        await changePublic(false);
                        setDataPublicEnable(false);
                      }
                    } finally {
                      setUpdateDataSyncEnableConfigLoading(false);
                    }
                  }}
                ></Switch>
              </Flex>
              variant="borderless"
              size="small"
            >
              <Form
                form={publicDataSettingForm}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 14 }}
                layout="horizontal"
                disabled={!dataPublicEnable}
                initialValues={publicDataSyncEnableConfig}
              >
                {public_data_setting.map((item) => {
                  return (
                    <Form.Item
                      key={item.name}
                      label={item.label}
                      name={item.name}
                      tooltip={{
                        color: 'white',
                        placement: 'right',
                        title: (
                          <Flex wrap gap={3}>
                            {item.header[item.header.length - 1].map((name) => {
                              return (
                                <Tag
                                  key={`${item.name}${name}`}
                                  color="magenta"
                                >
                                  {name}
                                </Tag>
                              );
                            })}
                          </Flex>
                        ),
                      }}
                    >
                      <Switch
                        onChange={async () => {
                          try {
                            setUpdateDataSyncEnableConfigLoading(true);
                            await updatePublicDataSyncEnableConfig(
                              publicDataSettingForm.getFieldsValue()
                            );
                          } finally {
                            setUpdateDataSyncEnableConfigLoading(false);
                          }
                        }}
                      ></Switch>
                    </Form.Item>
                  );
                })}
              </Form>
            </Card>
          </Spin>
        </Card>
        <Card title="数据管理" variant="borderless" size="small">
          <Flex vertical gap={5}>
            <DatabaseBackupRestore />
            <Card title="私有数据" variant='outlined' size='small'>
              <DataBackupRestore
                title="职位"
                getExcelJsonArrayFunction={getJobDataToExcelJsonArray}
                fileHeader={JOB_FILE_HEADER}
                saveDataFunction={saveJobData}
                getDataTotalFunction={getJobDataTotal}
                getMaxExportCount={async () => {
                  return JOB_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="公司"
                getExcelJsonArrayFunction={getCompanyDataToExcelJsonArray}
                fileHeader={COMPANY_FILE_HEADER}
                saveDataFunction={saveCompanyData}
                getDataTotalFunction={getCompanyDataTotal}
                getMaxExportCount={async () => {
                  return COMPANY_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="职位标签"
                getExcelJsonArrayFunction={getJobTagDataToExcelJsonArray}
                fileHeader={JOB_TAG_FILE_HEADER}
                saveDataFunction={saveJobTagData}
                getDataTotalFunction={getJobTagDataTotal}
                getMaxExportCount={async () => {
                  return JOB_TAG_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="公司标签"
                getExcelJsonArrayFunction={getCompanyTagDataToExcelJsonArray}
                fileHeader={COMPANY_TAG_FILE_HEADER}
                saveDataFunction={saveCompanyTagData}
                getDataTotalFunction={getCompanyTagDataTotal}
                getMaxExportCount={async () => {
                  return COMPANY_TAG_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="职位快照"
                getExcelJsonArrayFunction={getJobSnapshotDataToJsonArray}
                fileHeader={JOB_SNAPSHOT_FILE_HEADER}
                saveDataFunction={saveJobSnapshotData}
                getDataTotalFunction={getJobSnapshotDataTotal}
                getMaxExportCount={async () => {
                  return JOB_SNAPSHOT_MAX_EXPORT_SIZE;
                }}
                dataType={DATA_TYPE_NAME_JOB_SNAPSHOT}
                format="json"
                accept=".tar.xz"
              />
            </Card>
            <Card title="公开数据" variant='outlined' size='small'>
              <DataBackupRestore
                title="职位公开数据"
                getExcelJsonArrayFunction={getJobPublicDataToExcelJsonArray}
                fileHeader={JOB_PUBLIC_FILE_HEADER}
                saveDataFunction={saveJobPublicData}
                getDataTotalFunction={getJobPublicDataTotal}
                getMaxExportCount={async () => {
                  return JOB_PUBLIC_MAX_EXPORT_SIZE;
                }}
              />
            </Card>
          </Flex>
        </Card>
      </Flex>
      <Modal
        title="如何更新程序版本"
        width="80%"
        destroyOnClose
        open={isHowToUpdateModalOpen}
        onCancel={() => {
          setIsHowToUpdateModalOpen(false);
        }}
        footer={null}
      >
        <Flex vertical>
          <Text>1.下载新版本程序安装文件（zip格式文件）</Text>
          <Text>
            2.访问 chrome://extensions/
            地址，打开开发者模式，将zip文件拖进页面里
          </Text>
          <Text>3.ID为【{APP_ID}】的程序版本为新版本，即更新成功</Text>
        </Flex>
      </Modal>
      <Modal
        title="版本说明"
        width="80%"
        destroyOnClose
        open={isVersionDescModalOpen}
        onCancel={() => {
          setIsVersionDescModalOpen(false);
        }}
        footer={null}
      >
        <Markdown>{changelogContent}</Markdown>
      </Modal>
      <Modal
        title="许可证"
        width="80%"
        destroyOnClose
        open={isLicenseModalOpen}
        onCancel={() => {
          setIsLicenseModalOpen(false);
        }}
        footer={null}
      >
        <Markdown>{licenseContent}</Markdown>
      </Modal>
      <Modal
        title="免责声明"
        width="80%"
        destroyOnClose
        open={isStatementOfTermsModalOpen}
        onCancel={() => {
          setIsStatementOfTermsModalOpen(false);
        }}
        footer={null}
      >
        <Markdown>{statementOfTerms}</Markdown>
      </Modal>
      <Modal
        title="新版本详情"
        width="80%"
        destroyOnClose
        open={isLatestChangelogContentModalOpen}
        onCancel={() => {
          setIsLatestChangelogContentModalOpen(false);
        }}
        footer={null}
      >
        <Markdown>{latestChangelogContent}</Markdown>
      </Modal>
    </>
  );
};

export default SettingView;
