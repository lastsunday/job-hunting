import { getUser, resetPassword } from '@/api';
import { UserResult } from '@/data/user-result';
import {
  AppShell,
  Burger,
  Button,
  Group,
  Menu,
  MenuTarget,
  Modal,
  PasswordInput,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
      });
    }
  },
  component: RouteComponent,
});

const data = [
  { link: '', label: '仪表板', icon: 'i-mdi:monitor-dashboard' },
  { link: '/admin/jobs', label: '职位数据', icon: 'i-hugeicons:job-search' },
  { link: '/admin/companies', label: '公司数据', icon: 'i-mdi:company' },
  { link: '/admin/sync', label: '数据同步', icon: 'i-mdi:sync' },
  { link: '', label: '公司评论', icon: 'i-mingcute:comment-line' },
  {
    link: '',
    label: '任务',
    icon: 'i-material-symbols:other-admission-outline',
  },
  { link: '', label: '数据源', icon: 'i-material-symbols:dataset' },
  { link: '', label: '设置', icon: 'i-mdi:settings' },
];

function RouteComponent() {
  const router = useRouter();
  const navigate = Route.useNavigate();
  const auth = useAuth();
  const [opened, { toggle }] = useDisclosure();

  const [active, setActive] = useState('仪表板');

  const [openedPassword, { open: openPassword, close: closePassword }] =
    useDisclosure(false);

  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserResult | null>(null);

  const init = async () => {
    setUser(await getUser());
  };

  useEffect(() => {
    init();
  }, []);

  const handleLogout = () => {
    if (window.confirm('确认登出？')) {
      auth.logout().then(() => {
        router.invalidate().finally(() => {
          navigate({ to: '/login' });
        });
      });
    }
  };

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link || '#'}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
        if (item.link) {
          navigate({ to: item.link });
        }
      }}
    >
      <div className={`${item.icon} ${classes.linkIcon}`} />
      <span>{item.label}</span>
    </a>
  ));

  const onFormSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    try {
      evt.preventDefault();
      const data = new FormData(evt.currentTarget);
      const oldPasswordValue = data.get('oldPassword');
      const passwordValue = data.get('password');
      const confirmPasswordValue = data.get('confirmPassword');

      if (!oldPasswordValue || !passwordValue || !confirmPasswordValue) return;
      if (passwordValue !== confirmPasswordValue) {
        showNotification({
          color: 'red',
          title: '错误',
          message: '密码不一致',
        });
      } else {
        const oldPassword = oldPasswordValue.toString();
        const password = passwordValue.toString();
        await resetPassword({ password, old_password: oldPassword });
        showNotification({
          color: 'green',
          title: '密码修改成功',
          message: `请重新登录`,
        });
        await router.invalidate();
        auth.logout().then(() => {
          router.invalidate().finally(() => {
            navigate({ to: '/login' });
          });
        });
      }
    } catch (error) {
      console.error('Error logging in: ', error);
      showNotification({
        color: 'red',
        title: 'Error',
        message: `${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPasswordUpdating = isLoading || isSubmitting;

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
            <Menu withArrow width={200}>
              <MenuTarget>
                <UserButton
                  className="w-full"
                  name={user?.name ?? ''}
                  image=""
                  email=""
                />
              </MenuTarget>
              <Menu.Dropdown></Menu.Dropdown>
            </Menu>
          </div>
          <div className={classes.navbarMain}>{links}</div>

          <div className={classes.footer}>
            <a className={classes.link} onClick={openPassword}>
              <div className="i-mdi:password size-5 mr-2"></div>
              <span>修改密码</span>
            </a>
            <a
              href="#"
              className={classes.link}
              onClick={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              <div className="i-material-symbols:logout size-5 mr-2"></div>
              <span>登出</span>
            </a>
          </div>
        </nav>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      <Modal opened={openedPassword} onClose={closePassword} title="修改密码">
        <form className="mt-4 max-w-lg" onSubmit={onFormSubmit}>
          <PasswordInput
            name="oldPassword"
            label="原密码"
            placeholder="请输入原密码"
            required
            mt="md"
            radius="md"
            minLength={6}
            maxLength={16}
          />
          <PasswordInput
            name="password"
            label="密码"
            placeholder="请输入密码"
            required
            mt="md"
            radius="md"
            minLength={6}
            maxLength={16}
          />
          <PasswordInput
            name="confirmPassword"
            label="确认密码"
            placeholder="请输入确认密码"
            required
            mt="md"
            radius="md"
            minLength={6}
            maxLength={16}
          />
          <Button
            type="submit"
            fullWidth
            mt="xl"
            radius="md"
            disabled={isSubmitting}
          >
            {isPasswordUpdating ? '修改中...' : '修改密码'}
          </Button>
        </form>
      </Modal>
    </AppShell>
  );
}
