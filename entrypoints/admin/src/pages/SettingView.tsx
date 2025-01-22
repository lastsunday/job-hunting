import { APP_ID } from "@/common/config";
import { CheckCard } from '@ant-design/pro-components';
import { Icon } from '@iconify/react';
import { Button, Card, Flex, Modal, Tooltip, Typography, message } from 'antd';
import Markdown from "marked-react";
import React from 'react';
import { useShallow } from 'zustand/shallow';
import { useData } from '../hooks/data';
import useAuthStore from '../store/AuthStore';
import useDataSharePlanStore from '../store/DataSharePlanStore';
import useSystemStore from "../store/SystemStore";
import DataBackupRestore from './setting/DataBackupRestore';
import DatabaseBackupRestore from './setting/DatabaseBackupRestore';
const { Text, Link } = Typography;
import { JOB_MAX_EXPORT_SIZE, COMPANY_MAX_EXPORT_SIZE, JOB_TAG_MAX_EXPORT_SIZE, COMPANY_TAG_MAX_EXPORT_SIZE } from "@/common/config";

const version = __APP_VERSION__;


const SettingView: React.FC = () => {
  const [enable, change] = useDataSharePlanStore(useShallow(((state) => [
    state.enable,
    state.change
  ])));
  const [installAndLogin] = useAuthStore(useShallow((state => [
    state.installAndLogin,
  ])));
  const [dataSharePlanEnable, setDataSharePlanEnable] = useState(false);
  const {
    getJobDataToExcelJsonArray, getJobDataTotal, saveJobData, getCompanyDataToExcelJsonArray, getCompanyDataTotal,
    saveCompanyData, getCompanyTagDataToExcelJsonArray, saveCompanyTagData, getCompanyTagDataTotal,
    getJobTagDataToExcelJsonArray, saveJobTagData, getJobTagDataTotal,
    JOB_FILE_HEADER, COMPANY_FILE_HEADER, COMPANY_TAG_FILE_HEADER, JOB_TAG_FILE_HEADER,
  } = useData();
  const [isHowToUpdateModalOpen, setIsHowToUpdateModalOpen] = useState(false);
  const [isVersionDescModalOpen, setIsVersionDescModalOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState("");
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseContent, setLicenseContent] = useState("");
  const [versionChecking, setVersionChecking] = useState(false);
  const [checkingVersionText, setCheckingVersionText] = useState("");
  const [isLatestChangelogContentModalOpen, setIsLatestChangelogContentModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [refreshCheckVersion, setRefreshCheckVersion] = useState(false);
  const [versionObject, newVersion, latestVersion, latestVersionCreatedAt, latestChangelogContent, query, downloadLatest] = useSystemStore(useShallow((state => [
    state.versionObject,
    state.newVersion,
    state.latestVersion,
    state.latestVersionCreatedAt,
    state.latestChangelogContent,
    state.query,
    state.downloadLatest,
  ])));

  useEffect(() => {
    setDataSharePlanEnable(enable);
  }, [])

  useEffect(() => {
    onCheckVersion();
  }, [refreshCheckVersion])

  const onCheckVersion = async () => {
    setVersionChecking(true);
    setCheckingVersionText("正检查新版本");
    try {
      await query();
      setCheckingVersionText("已是最新版本，点击再检查");
      setVersionChecking(false);
    } catch (e) {
      setCheckingVersionText("版本检查失败，请点击再次检查");
    }
  }

  return <>
    {contextHolder}
    <Flex gap="small" wrap vertical>
      <Card title="程序信息" bordered={false} size="small">
        <Flex gap={10} vertical>
          <Flex gap={10}>
            <Text type="success">版本 {version}</Text>
            {versionChecking ? <Text type="secondary">{checkingVersionText}</Text> : <>
              {newVersion ? <Flex gap={10}>
                <Text type="warning">发现新版本[{latestVersion}]{latestVersionCreatedAt}</Text>
                <Button type="primary" size="small" onClick={() => {
                  setIsLatestChangelogContentModalOpen(true);
                }}>查看新版本详情</Button>
                <Button type="primary" size="small" onClick={() => {
                  try {
                    downloadLatest(versionObject);
                  } catch (e) {
                    messageApi.error(e.message);
                  }
                }}><Icon icon="mdi:download" />下载新版本</Button>
              </Flex> : <Text type="success" onClick={() => {
                setRefreshCheckVersion(!refreshCheckVersion);
              }}>已是最新版本</Text>}
            </>}
          </Flex>
          <Flex gap={5}>
            <Button onClick={() => {
              setIsHowToUpdateModalOpen(true);
            }}>
              如何更新程序版本
              <Icon icon="ph:question" />
            </Button>
            <Button onClick={async () => {
              let changelogUrl = chrome.runtime.getURL("CHANGELOG.md");
              setChangelogContent(await (await fetch(changelogUrl)).text());
              setIsVersionDescModalOpen(true);
            }}>
              版本说明
            </Button>
            <Button onClick={async () => {
              let licenseUrl = chrome.runtime.getURL("LICENSE");
              setLicenseContent(await (await fetch(licenseUrl)).text());
              setIsLicenseModalOpen(true);
            }}>
              许可证
            </Button>
            <Button onClick={async () => {
              let packageUrl = chrome.runtime.getURL("package.json");
              let packageObject = await (await fetch(packageUrl)).json();
              window.open(packageObject.homepage);
            }}>
              访问主页
            </Button>
            <Button onClick={async () => {
              let packageUrl = chrome.runtime.getURL("package.json");
              let packageObject = await (await fetch(packageUrl)).json();
              window.open(packageObject.bugs);
            }}>
              问题反馈
            </Button>
          </Flex>
        </Flex >
      </Card >
      <Card title="GitHub App" bordered={false} size="small">
        <Flex vertical gap={5}>
          <Flex>
            <Tooltip title="安装GitHubApp获得评论、数据共享计划能力">
              <Button onClick={() => {
                installAndLogin();
              }} icon=<Icon icon="mdi:github" />>安装GitHubApp并登录</Button>
            </Tooltip>
          </Flex>
          <Flex gap={5}>
            <Text type="warning">注意：Github App要求的授权：</Text>
            <Link target="_blank"
              href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-administration">Administration
              <Icon icon="mingcute:warning-line" />
            </Link>
            <Link target="_blank"
              href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-issues">Issues
              <Icon icon="mingcute:warning-line" />
            </Link>
            <Link target="_blank"
              href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-contents">Contents
              <Icon icon="mingcute:warning-line" />
            </Link>
            <Link target="_blank"
              href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-metadata">Metadata
              <Icon icon="mingcute:warning-line" />
            </Link>
          </Flex>
        </Flex>
      </Card>
      <Card title="数据共享计划" bordered={false} size="small">
        <CheckCard.Group
          onChange={async (value) => {
            if (value) {
              await change(true);
              setDataSharePlanEnable(true);
            } else {
              await change(false);
              setDataSharePlanEnable(false);
            }
          }}
          value={dataSharePlanEnable}
        >
          <CheckCard title="开启" description="开启数据共享计划" value={true} />
          <CheckCard title="关闭" description="关闭数据共享计划" value={false} />
        </CheckCard.Group>
      </Card>
      <Card title="数据管理" bordered={false} size="small">
        <Flex vertical gap={5}>
          <DatabaseBackupRestore />
          <DataBackupRestore title="职位" getExcelJsonArrayFunction={getJobDataToExcelJsonArray}
            fileHeader={JOB_FILE_HEADER} saveDataFunction={saveJobData} getDataTotalFunction={getJobDataTotal} getMaxExportCount={async () => { return JOB_MAX_EXPORT_SIZE }} />
          <DataBackupRestore title="公司" getExcelJsonArrayFunction={getCompanyDataToExcelJsonArray}
            fileHeader={COMPANY_FILE_HEADER} saveDataFunction={saveCompanyData} getDataTotalFunction={getCompanyDataTotal} getMaxExportCount={async () => { return COMPANY_MAX_EXPORT_SIZE }} />
          <DataBackupRestore title="职位标签" getExcelJsonArrayFunction={getJobTagDataToExcelJsonArray}
            fileHeader={JOB_TAG_FILE_HEADER} saveDataFunction={saveJobTagData} getDataTotalFunction={getJobTagDataTotal} getMaxExportCount={async () => { return JOB_TAG_MAX_EXPORT_SIZE }} />
          <DataBackupRestore title="公司标签"
            getExcelJsonArrayFunction={getCompanyTagDataToExcelJsonArray} fileHeader={COMPANY_TAG_FILE_HEADER}
            saveDataFunction={saveCompanyTagData} getDataTotalFunction={getCompanyTagDataTotal} getMaxExportCount={async () => { return COMPANY_TAG_MAX_EXPORT_SIZE }} />
        </Flex>
      </Card>
    </Flex >
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
        <Text>2.解压程序安装文件</Text>
        <Text>3.访问 chrome://extensions/ 地址，点击加载已解压的扩展程序，选择解压后 manifest.json 文件所在的目录</Text>
        <Text>4.ID为【{APP_ID}】的程序版本为新版本，即更新成功</Text>
      </Flex>
    </Modal >
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
      <Markdown>
        {changelogContent}
      </Markdown>
    </Modal >
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
      <Markdown>
        {licenseContent}
      </Markdown>
    </Modal >
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
      <Markdown>
        {latestChangelogContent}
      </Markdown>
    </Modal >
  </>
};

export default SettingView;