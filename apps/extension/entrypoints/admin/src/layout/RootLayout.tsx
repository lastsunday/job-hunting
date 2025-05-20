import {
  CommentOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  FileOutlined,
  HistoryOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  SettingOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Breadcrumb, Button, Flex, Layout, Menu, theme } from 'antd';
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useShallow } from 'zustand/shallow';
import logo from '../assets/logo.svg';
import useAnalysisStore from '../store/AnalysisStore';
import useJobSnapshotStore from '../store/JobSnapshotStore';
import HeaderRight from './HeaderRight';
const { Header, Sider, Content } = Layout;

const siderStyle: React.CSSProperties = {
  overflow: 'auto',
  scrollbarWidth: 'thin',
  scrollbarGutter: 'stable',
};

const RootLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [pathTitleMap, setPathTitleMap] = useState(new Map());
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const [analysisConfig] = useAnalysisStore(
    useShallow((state) => [state.config])
  );

  const genDataSharePlanMenu = () => {
    return [{ key: 'manager', label: '管理' }];
  };

  const genTaskMenu = () => {
    return [
      { key: 'taskStatistic', label: '统计' },
      { key: 'taskDetail', label: '详情' },
    ];
  };

  const genAnalysisMenu = () => {
    if (analysisConfig.enable) {
      return [{ key: 'analysisSetting', label: '设置' }];
    } else {
      return [{ key: 'analysisWelcome', label: '欢迎使用' }];
    }
  };

  const [jobSnapshotConfig] = useJobSnapshotStore(
    useShallow((state) => [state.config])
  );

  const refreshMenu = () => {
    const menu = [
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
          jobSnapshotConfig.enable
            ? { key: 'jobSnapshot', label: '职位快照' }
            : null,
          { key: 'company', label: '公司' },
          { key: 'tag', label: '标签' },
          { key: 'companyTag', label: '公司标签' },
          { key: 'jobTag', label: '职位标签' },
          { key: 'jobPublic', label: '职位公开数据' },
        ],
      },
      {
        key: 'analysisPlan',
        icon: <div className="i-mdi:think-outline" />,
        label: '职位分析',
        children: [...genAnalysisMenu()],
      },
      jobSnapshotConfig.enable
        ? null
        : {
          key: 'jobSnapshotSetting',
          icon: <HistoryOutlined />,
          label: '职位快照',
        },
      {
        key: 'dataSource',
        icon: <DatabaseOutlined />,
        label: '数据源',
        children: [...genDataSharePlanMenu()],
      },
      {
        key: 'task',
        icon: <div className="i-material-symbols:other-admission-outline" />,
        label: '任务',
        children: [...genTaskMenu()],
      },
      {
        key: 'file',
        icon: <FileOutlined />,
        label: '文件',
      },
      {
        key: 'system',
        icon: <DesktopOutlined />,
        label: '系统',
      },
      {
        key: 'setting',
        icon: <SettingOutlined />,
        label: '设置',
      },
    ];
    setMenuItems(menu);
    const walkResult = new Map();
    walkMenu({ menuItems: menu, resultMap: walkResult });
    setPathTitleMap(walkResult);
  };

  useEffect(() => {
    refreshMenu();
  }, [jobSnapshotConfig, analysisConfig]);

  const walkMenu = ({ menuItems, parentMenu = null, resultMap = null }) => {
    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      if (item) {
        resultMap.set(
          `${parentMenu?.key ?? ''}/${item.key}`,
          (parentMenu ? parentMenu.label ?? [] : []).concat(item.label)
        );
        if (item.children && item.children.length > 0) {
          walkMenu({
            menuItems: item.children ?? [],
            parentMenu: {
              key: `${parentMenu?.key ?? ''}/${item.key}`,
              label: (parentMenu ? parentMenu.label ?? [] : []).concat(
                item.label
              ),
            },
            resultMap,
          });
        }
      }
    }
  };

  const [breadcrumbItem, setBreadcrumbItem] = useState([]);

  useEffect(() => {
    refreshBreadcrumb();
  }, [location, pathTitleMap]);

  const refreshBreadcrumb = () => {
    setBreadcrumbItem(
      pathTitleMap.get(location.pathname)?.map((item) => {
        return { title: item };
      })
    );
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
          onSelect={({ keyPath }) => {
            navigate(`/${keyPath.reverse().join('/')}`);
          }}
          items={menuItems}
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
            <Flex align="center">
              <Breadcrumb items={breadcrumbItem} />
            </Flex>
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
