import {
  CommentOutlined,
  DatabaseOutlined,
  FileOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  SettingOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Icon } from '@iconify/react';
import { Button, Flex, Layout, Menu, theme } from 'antd';
import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useShallow } from 'zustand/shallow';
import logo from '../assets/logo.svg';
import useDataSharePlanStore from '../store/DataSharePlanStore';
import useAnalysisStore from '../store/AnalysisStore';
import HeaderRight from './HeaderRight';
const { Header, Sider, Content } = Layout;

const siderStyle: React.CSSProperties = {
  overflow: 'auto',
  scrollbarWidth: 'thin',
  scrollbarGutter: 'stable',
};

const RootLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();

  const [dataSharePlanEnable] = useDataSharePlanStore(
    useShallow((state) => [state.enable])
  );

  const [analysisConfig] = useAnalysisStore(
    useShallow((state) => [state.config])
  );

  const genDataSharePlanMenu = () => {
    if (dataSharePlanEnable) {
      return [
        { key: 'dataSharePlanStatistic', label: '统计' },
        { key: 'task', label: '任务' },
        { key: 'partner', label: '伙伴' },
      ];
    } else {
      return [{ key: 'dataSharePlanWelcome', label: '欢迎使用' }];
    }
  };

  const genAnalysisMenu = () => {
    if (analysisConfig.enable) {
      return [{ key: 'analysisSetting', label: '设置' }];
    } else {
      return [{ key: 'analysisWelcome', label: '欢迎使用' }];
    }
  };

  return (
    <Layout className="root" hasSider>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        trigger={null}
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
        collapsible
        collapsed={collapsed}
        style={siderStyle}
      >
        <Flex gap="middle" align="center" vertical>
          <img className="logo" src={logo}></img>
        </Flex>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          onSelect={({ key }) => {
            navigate(`/${key}`);
          }}
          items={[
            {
              key: '',
              icon: <HomeOutlined />,
              label: '首页',
            },
            {
              key: 'assistant',
              icon: <RobotOutlined />,
              label: '个人助理',
              children: [
                { key: 'favoriteJob', label: '职位偏好' },
                { key: 'historyJob', label: '浏览历史' },
                { key: 'automate', label: '自动化' },
              ],
            },
            {
              key: 'bbs',
              icon: <CommentOutlined />,
              label: '讨论区',
            },
            {
              key: 'data',
              icon: <DatabaseOutlined />,
              label: '数据',
              children: [
                { key: 'job', label: '职位' },
                { key: 'company', label: '公司' },
                { key: 'tag', label: '标签' },
                { key: 'companyTag', label: '公司标签' },
                { key: 'jobTag', label: '职位标签' },
              ],
            },
            {
              key: 'analysisPlan',
              icon: <Icon icon="mdi:think-outline" />,
              label: '职位分析',
              children: [...genAnalysisMenu()],
            },
            {
              key: 'dataSharePlan',
              icon: <ShareAltOutlined />,
              label: '数据共享计划',
              children: [...genDataSharePlanMenu()],
            },
            {
              key: 'file',
              icon: <FileOutlined />,
              label: '文件',
            },
            {
              key: 'system',
              icon: <Icon icon="icon-park-outline:system" />,
              label: '系统',
            },
            {
              key: 'setting',
              icon: <SettingOutlined />,
              label: '设置',
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <Flex>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <Flex flex={1} justify="end">
              <HeaderRight></HeaderRight>
            </Flex>
          </Flex>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default RootLayout;
