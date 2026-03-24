import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Group,
  Button,
  Stack,
  Badge,
  TextInput,
  FileInput,
  Select,
  Alert,
  RingProgress,
  Skeleton,
  PasswordInput,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { syncApi, SyncStatus, SyncConfig, SyncGitParam } from '@/api/sync';

export const Route = createFileRoute('/_pathlessLayout/admin/sync')({
  component: RouteComponent,
});

function RouteComponent() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<string>('job');
  const [baseUrl, setBaseUrl] = useState('https://api.github.com');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');

  const loadData = async () => {
    try {
      const [statusData, configData] = await Promise.all([
        syncApi.getStatus(),
        syncApi.getConfig(),
      ]);
      setStatus(statusData);
      setConfig(configData);
      setBaseUrl(configData.git_base_url || 'https://api.github.com');
      setRepo(configData.default_repo || '');
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Failed to load data: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncJobs = async () => {
    if (!owner || !repo) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: 'Please enter owner and repo name',
      });
      return;
    }
    setSyncing(true);
    try {
      const param: SyncGitParam = {
        base_url: baseUrl || undefined,
        owner,
        repo_name: repo,
        token: token || undefined,
      };
      const result = await syncApi.syncGitJobs(param);
      showNotification({
        color: result.success ? 'green' : 'red',
        title: result.success ? 'Success' : 'Error',
        message: `Imported ${result.imported} jobs from ${result.total_files} files`,
      });
      loadData();
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Sync failed: ${error}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCompanies = async () => {
    if (!owner || !repo) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: 'Please enter owner and repo name',
      });
      return;
    }
    setSyncing(true);
    try {
      const param: SyncGitParam = {
        base_url: baseUrl || undefined,
        owner,
        repo_name: repo,
        token: token || undefined,
      };
      const result = await syncApi.syncGitCompanies(param);
      showNotification({
        color: result.success ? 'green' : 'red',
        title: result.success ? 'Success' : 'Error',
        message: `Imported ${result.imported} companies from ${result.total_files} files`,
      });
      loadData();
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Sync failed: ${error}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileImport = async () => {
    if (!file) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: 'Please select a file',
      });
      return;
    }
    setSyncing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const result = await syncApi.importFile(dataType, base64);
      showNotification({
        color: result.success ? 'green' : 'red',
        title: result.success ? 'Success' : 'Error',
        message: `Imported ${result.imported} records`,
      });
      loadData();
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Import failed: ${error}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Stack>
        <Skeleton height={50} radius="md" />
        <Skeleton height={200} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Title order={2}>数据同步</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          同步状态
        </Title>
        <Group>
          <RingProgress
            size={120}
            thickness={12}
            roundCaps
            sections={[
              {
                value: status
                  ? (status.total_jobs /
                      (status.total_jobs + status.total_companies || 1)) *
                    100
                  : 0,
                color: 'blue',
              },
            ]}
            label={
              <Text ta="center" fw={700}>
                {status?.total_jobs || 0}
                <Text span size="xs" fw={400}>
                  {' '}
                  jobs
                </Text>
              </Text>
            }
          />
          <RingProgress
            size={120}
            thickness={12}
            roundCaps
            sections={[
              {
                value: status
                  ? (status.total_companies /
                      (status.total_jobs + status.total_companies || 1)) *
                    100
                  : 0,
                color: 'green',
              },
            ]}
            label={
              <Text ta="center" fw={700}>
                {status?.total_companies || 0}
                <Text span size="xs" fw={400}>
                  {' '}
                  companies
                </Text>
              </Text>
            }
          />
          <Stack gap="xs">
            <Text size="sm">
              最后同步职位:{' '}
              <Badge color="blue">{status?.last_sync_job || '从未同步'}</Badge>
            </Text>
            <Text size="sm">
              最后同步公司:{' '}
              <Badge color="green">
                {status?.last_sync_company || '从未同步'}
              </Badge>
            </Text>
            <Text size="sm">
              定时任务:{' '}
              <Badge color={status?.scheduler_running ? 'green' : 'gray'}>
                {status?.scheduler_running ? '运行中' : '已停止'}
              </Badge>
            </Text>
          </Stack>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Git 同步
        </Title>
        <Stack>
          <TextInput
            label="Git API URL"
            placeholder="https://api.github.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label="仓库所有者 (Owner)"
              placeholder="Enter owner"
              value={owner}
              onChange={(e) => setOwner(e.currentTarget.value)}
            />
            <TextInput
              label="仓库名称"
              placeholder="Enter repo name"
              value={repo}
              onChange={(e) => setRepo(e.currentTarget.value)}
            />
          </Group>
          <PasswordInput
            label="Token (可选)"
            placeholder="Enter token if needed"
            value={token}
            onChange={(e) => setToken(e.currentTarget.value)}
          />
          <Group>
            <Button
              loading={syncing}
              onClick={handleSyncJobs}
              leftSection={<div className="i-mdi:github" />}
            >
              同步职位数据
            </Button>
            <Button
              loading={syncing}
              onClick={handleSyncCompanies}
              variant="outline"
              leftSection={<div className="i-mdi:github" />}
            >
              同步公司数据
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          文件导入
        </Title>
        <Stack>
          <Select
            label="数据类型"
            data={[
              { value: 'job', label: '职位' },
              { value: 'company', label: '公司' },
            ]}
            value={dataType}
            onChange={(value) => setDataType(value || 'job')}
          />
          <FileInput
            label="选择 Excel 文件"
            placeholder="点击选择文件"
            accept=".xlsx,.xls"
            value={file}
            onChange={setFile}
          />
          <Button loading={syncing} onClick={handleFileImport} disabled={!file}>
            导入数据
          </Button>
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          定时任务配置
        </Title>
        <Stack>
          <Alert
            color={config?.schedule_enabled ? 'green' : 'gray'}
            title="定时同步状态"
          >
            {config?.schedule_enabled ? '已启用' : '已禁用'}
          </Alert>
          <Text size="sm">
            Cron 表达式: <code>{config?.schedule_cron}</code>
          </Text>
          <Text size="sm">
            同步职位:{' '}
            <Badge color={config?.sync_jobs ? 'green' : 'red'}>
              {config?.sync_jobs ? '是' : '否'}
            </Badge>
          </Text>
          <Text size="sm">
            同步公司:{' '}
            <Badge color={config?.sync_companies ? 'green' : 'red'}>
              {config?.sync_companies ? '是' : '否'}
            </Badge>
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
