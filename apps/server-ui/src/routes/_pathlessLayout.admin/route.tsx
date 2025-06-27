import { getUser } from '@/api';
import { AppShell, Burger, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import logo from '../../assets/logo.svg';
import { useAuth } from '../../hooks/auth';
import { UserButton } from '../../widget/UserButton/UserButton';
import classes from './route.module.css';

export const Route = createFileRoute('/_pathlessLayout/admin')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: RouteComponent,
})

const data = [
  { link: '', label: '仪表板', icon: "i-mdi:monitor-dashboard" },
  { link: '', label: '职位数据', icon: "i-hugeicons:job-search" },
  { link: '', label: '公司数据', icon: "i-mdi:company" },
  { link: '', label: '公司评论', icon: "i-mingcute:comment-line" },
  { link: '', label: '任务', icon: "i-material-symbols:other-admission-outline" },
  { link: '', label: '数据源', icon: "i-material-symbols:dataset" },
  { link: '', label: '设置', icon: "i-mdi:settings" },
];

function RouteComponent() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const auth = useAuth()
  const [opened, { toggle }] = useDisclosure();

  const [active, setActive] = useState('仪表板');


  const handleLogout = () => {
    if (window.confirm('确认登出？')) {
      auth.logout().then(() => {
        router.invalidate().finally(() => {
          navigate({ to: '/admin' })
        })
      })
    }
  }

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
      }}
    >
      <div className={`${item.icon} ${classes.linkIcon}`} />
      <span>{item.label}</span>
    </a>
  ));

  const { data: user, isLoading, isSuccess } = useQuery({
    queryKey: [],
    queryFn: getUser
  })

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <img className={classes.logo} src={logo}></img>
          <Text>职位猎人(后台)</Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <nav className={classes.navbar}>
          <div className={classes.section}>
            <UserButton name={user?.name} />
          </div>
          <div className={classes.navbarMain}>
            {links}
          </div>

          <div className={classes.footer}>
            <a href="#" className={classes.link} onClick={
              (event) => {
                event.preventDefault();
                handleLogout();
              }}>
              <div className="i-material-symbols:logout"></div>
              <span>登出</span>
            </a>
          </div>
        </nav>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell >
  );
}
