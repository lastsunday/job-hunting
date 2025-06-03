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
  SettingOutlined
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
    return [
      {
        key: 'list',
        icon: <div className="i-material-symbols-light:view-list-outline-sharp" />,
        label: '列表'
      },
      {
        key: 'metadata',
        icon: <div className="i-uil:list-ul" />,
        label: '元数据'
      },
    ];
  };

  const genTaskMenu = () => {
    return [
      {
        key: 'taskStatistic',
        icon: <div className="i-wpf:statistics" />,
        label: '统计'
      },
      {
        key: 'taskDetail',
        icon: <div className="i-bx:detail" />,
        label: '详情'
      },
    ];
  };

  const genAnalysisMenu = () => {
    if (analysisConfig.enable) {
      return [{ icon: <div className="i-mdi:think-outline" />, key: 'analysisSetting', label: '职位分析' }];
    } else {
      return [{ icon: <div className="i-mdi:think-outline" />, key: 'analysisWelcome', label: '职位分析' }];
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
          {
            key: 'favoriteJob',
            icon: <div className="i-f7:square-favorites-alt"></div>,
            label: '职位偏好'
          },
          {
            key: 'historyJob',
            icon: <div className="i-material-symbols:history"></div>,
            label: '浏览历史'
          },
          {
            key: 'automate',
            icon: <div className="i-meteor-icons:robot"></div>,
            label: '自动化'
          },
          ...genAnalysisMenu(),
          jobSnapshotConfig.enable
            ? { key: 'jobSnapshot', icon: <HistoryOutlined />, label: '职位快照' }
            : {
              key: 'jobSnapshotSetting',
              icon: <HistoryOutlined />,
              label: '职位快照',
            },
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
          {
            key: 'job',
            icon: <div className="i-hugeicons:job-search"></div>,
            label: '职位'
          },
          jobSnapshotConfig.enable
            ? {
              key: 'jobSnapshot',
              icon: <div className="i-qlementine-icons:snapshot-16"></div>,
              label: '职位快照'
            }
            : null,
          {
            key: 'company',
            icon: <div className="i-mdi:company"></div>,
            label: '公司'
          },
          {
            key: 'tag',
            icon: <div className="i-mingcute:tag-line"></div>,
            label: '标签'
          },
          {
            key: 'companyTag',
            icon: <div className="i-mingcute:tag-line"></div>,
            label: '公司标签'
          },
          {
            key: 'jobTag',
            icon: <div className="i-mingcute:tag-line"></div>,
            label: '职位标签'
          },
          {
            key: 'jobPublic',
            icon: <div className="i-material-symbols:public"></div>,
            label: '职位公开数据'
          },
          {
            key: 'companyComment',
            icon: <div className="i-mingcute:comment-line"></div>,
            label: '公司评论'
          },
        ],
      },
      {
        key: 'dataSource',
        icon: <div className='i-material-symbols:dataset'></div>,
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
        key: 'system',
        icon: <DesktopOutlined />,
        label: '系统',
        children: [
          {
            key: 'setting',
            icon: <SettingOutlined />,
            label: '设置',
          },
          {
            key: 'dataManagement',
            icon: <div className='i-fluent-mdl2:data-management-settings'></div>,
            label: '数据管理',
          },
          {
            key: 'database',
            icon: <DatabaseOutlined />,
            label: '数据库',
          },
          {
            key: 'file',
            icon: <FileOutlined />,
            label: '文件',
          },
        ],
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

  const [selectedKeys, setSelectedKeys] = useState(['']);
  const [openKeys, setOpenKeys] = useState(['']);

  const refreshBreadcrumb = () => {
    setSelectedKeys(getKeysFromPath(location.pathname));
    setOpenKeys(getKeysFromPath(location.pathname));
    setBreadcrumbItem(
      pathTitleMap.get(location.pathname)?.map((item) => {
        return { title: item };
      })
    );
  };

  const getKeysFromPath = (path) => {
    const splitPathArray = path.split("/");
    //skip index 0 path
    return splitPathArray.slice(1, splitPathArray.length);
  }


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
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onSelect={({ keyPath }) => {
            setSelectedKeys(keyPath);
            navigate(`/${keyPath.reverse().join('/')}`);
          }}
          onOpenChange={(openKeys) => {
            setOpenKeys(openKeys);
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
