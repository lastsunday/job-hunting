import { getVersion } from '@/api';
import {
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
  Select,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import React, { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '../hooks/auth';
import { useTranslation } from 'react-i18next';
import classes from './login.module.css';

const fallback = '/admin' as const;

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect || fallback });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();
  const router = useRouter();
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const navigate = Route.useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const search = Route.useSearch();
  const { t, i18n } = useTranslation(['login', 'common']);

  const {
    data: version,
    isLoading: isVersionLoading,
    isSuccess: isVersionSuccess,
  } = useQuery({
    queryKey: [],
    queryFn: getVersion,
  });

  const onFormSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    try {
      evt.preventDefault();
      const data = new FormData(evt.currentTarget);
      const accountValue = data.get('account');
      const passwordValue = data.get('password');

      if (!accountValue || !passwordValue) return;
      const account = accountValue.toString();
      const password = passwordValue.toString();
      await auth.login(account, password);

      await router.invalidate();

      await navigate({ to: search.redirect || fallback });
    } catch (error) {
      console.error('Error logging in: ', error);
      showNotification({
        color: 'red',
        title: t('common:error'),
        message: `${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoggingIn = isLoading || isSubmitting;

  return (
    <Container size={420} my={40}>
      <Group justify="flex-end" mb="sm">
        <Select
          value={i18n.language}
          onChange={(value) =>
            value && i18n.changeLanguage(value as 'zh' | 'en')
          }
          data={[
            { value: 'zh', label: '🇨🇳 中文' },
            { value: 'en', label: '🇺🇸 EN' },
          ]}
          size="xs"
          styles={{ input: { minWidth: 90 } }}
        />
      </Group>
      <Title ta="center" className={classes.title}>
        {t('login:welcomeBack')}
        <Text size="xs">
          {t('common:version')}:{' '}
          {isVersionLoading
            ? '...'
            : isVersionSuccess
            ? version
            : t('common:na')}
        </Text>
      </Title>

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <form className="mt-4 max-w-lg" onSubmit={onFormSubmit}>
          <TextInput
            name="account"
            label={t('login:account')}
            placeholder={t('login:pleaseEnterAccount')}
            required
            radius="md"
            minLength={4}
            maxLength={16}
          />
          <PasswordInput
            name="password"
            label={t('login:password')}
            placeholder={t('login:pleaseEnterPassword')}
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
            {isLoggingIn ? t('common:loading') : t('login:login')}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
