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
  Select,
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
import { useTranslation } from '../../i18n';
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
  { link: '/admin', label: 'admin.dashboard', icon: 'i-mdi:monitor-dashboard' },
  {
    link: '/admin/jobs',
    label: 'admin.jobData',
    icon: 'i-hugeicons:job-search',
  },
  {
    link: '/admin/companies',
    label: 'admin.companyData',
    icon: 'i-mdi:company',
  },
  { link: '/admin/sync', label: 'admin.dataSync', icon: 'i-mdi:sync' },
  { link: '', label: 'admin.companyComment', icon: 'i-mingcute:comment-line' },
  {
    link: '',
    label: 'admin.task',
    icon: 'i-material-symbols:other-admission-outline',
  },
  { link: '', label: 'admin.dataSource', icon: 'i-material-symbols:dataset' },
  { link: '', label: 'admin.settings', icon: 'i-mdi:settings' },
];

function RouteComponent() {
  const router = useRouter();
  const navigate = Route.useNavigate();
  const auth = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [opened, { toggle }] = useDisclosure();

  const [active, setActive] = useState('admin.dashboard');

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
    if (window.confirm(t('admin.confirmLogout'))) {
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
      <span>{t(item.label as any)}</span>
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
          title: t('common.error'),
          message: t('password.passwordMismatch'),
        });
      } else {
        const oldPassword = oldPasswordValue.toString();
        const password = passwordValue.toString();
        await resetPassword({ password, old_password: oldPassword });
        showNotification({
          color: 'green',
          title: t('password.passwordChangeSuccess'),
          message: t('password.pleaseReLogin'),
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
        title: t('common.error'),
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
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <img className={classes.logo} src={logo}></img>
            <Text>{t('admin.jobHunter')}</Text>
          </Group>
          <Select
            value={locale}
            onChange={(value) => value && setLocale(value as 'zh' | 'en')}
            data={[
              { value: 'zh', label: '🇨🇳 中文' },
              { value: 'en', label: '🇺🇸 EN' },
            ]}
            size="xs"
            styles={{ input: { minWidth: 90 } }}
          />
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
              <span>{t('admin.changePassword')}</span>
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
              <span>{t('admin.logout')}</span>
            </a>
          </div>
        </nav>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      <Modal
        opened={openedPassword}
        onClose={closePassword}
        title={t('password.changePassword')}
      >
        <form className="mt-4 max-w-lg" onSubmit={onFormSubmit}>
          <PasswordInput
            name="oldPassword"
            label={t('password.oldPassword')}
            placeholder={t('password.pleaseEnterOldPassword')}
            required
            mt="md"
            radius="md"
            minLength={6}
            maxLength={16}
          />
          <PasswordInput
            name="password"
            label={t('password.newPassword')}
            placeholder={t('password.pleaseEnterPassword')}
            required
            mt="md"
            radius="md"
            minLength={6}
            maxLength={16}
          />
          <PasswordInput
            name="confirmPassword"
            label={t('password.confirmPassword')}
            placeholder={t('password.pleaseEnterConfirmPassword')}
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
            {isPasswordUpdating
              ? t('password.changing')
              : t('password.changePassword')}
          </Button>
        </form>
      </Modal>
    </AppShell>
  );
}
