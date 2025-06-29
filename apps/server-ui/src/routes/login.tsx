import { getVersion } from "@/api";
import {
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useRouter, useRouterState } from '@tanstack/react-router';
import React, { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '../hooks/auth';
import classes from './login.module.css';

const fallback = '/admin' as const

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect || fallback })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const router = useRouter()
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const navigate = Route.useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const search = Route.useSearch()

  const { data: version, isLoading: isVersionLoading, isSuccess: isVersionSuccess } = useQuery({
    queryKey: [],
    queryFn: getVersion
  })

  const onFormSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true)
    try {
      evt.preventDefault()
      const data = new FormData(evt.currentTarget)
      const accountValue = data.get('account')
      const passwordValue = data.get('password')

      if (!accountValue || !passwordValue) return
      const account = accountValue.toString()
      const password = passwordValue.toString()
      await auth.login(account, password);

      await router.invalidate()


      await navigate({ to: search.redirect || fallback })
    } catch (error) {
      console.error('Error logging in: ', error)
      showNotification({
        color: "red",
        title: "Error",
        message: `${error}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoggingIn = isLoading || isSubmitting

  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
        欢迎回来
        <Text size='xs'>Version: {isVersionLoading ? '...' : isVersionSuccess ? version : 'N/A'}</Text>
      </Title>

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <form className="mt-4 max-w-lg" onSubmit={onFormSubmit}>
          <TextInput name="account" label="账户" placeholder="请输入账号" required radius="md" minLength={4} maxLength={16} />
          <PasswordInput name="password" label="密码" placeholder="请输入密码" required mt="md" radius="md" minLength={6} maxLength={16} />
          <Button type='submit' fullWidth mt="xl" radius="md" disabled={isSubmitting}>
            {isLoggingIn ? '加载中...' : '登录'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
