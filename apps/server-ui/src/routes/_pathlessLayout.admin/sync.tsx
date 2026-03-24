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
import { useTranslation } from '../../i18n';

export const Route = createFileRoute('/_pathlessLayout/admin/sync')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
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
      <Title order={2}>{t('sync.title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          {t('sync.syncStatus')}
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
              {t('sync.lastSyncJob')}:{' '}
              <Badge color="blue">
                {status?.last_sync_job || t('sync.neverSynced')}
              </Badge>
            </Text>
            <Text size="sm">
              {t('sync.lastSyncCompany')}:{' '}
              <Badge color="green">
                {status?.last_sync_company || t('sync.neverSynced')}
              </Badge>
            </Text>
            <Text size="sm">
              {t('sync.scheduledTask')}:{' '}
              <Badge color={status?.scheduler_running ? 'green' : 'gray'}>
                {status?.scheduler_running
                  ? t('sync.running')
                  : t('sync.stopped')}
              </Badge>
            </Text>
          </Stack>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          {t('sync.gitSync')}
        </Title>
        <Stack>
          <TextInput
            label={t('sync.gitApiUrl')}
            placeholder="https://api.github.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label={t('sync.repoOwner')}
              placeholder="Enter owner"
              value={owner}
              onChange={(e) => setOwner(e.currentTarget.value)}
            />
            <TextInput
              label={t('sync.repoName')}
              placeholder="Enter repo name"
              value={repo}
              onChange={(e) => setRepo(e.currentTarget.value)}
            />
          </Group>
          <PasswordInput
            label={t('sync.tokenOptional')}
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
              {t('sync.syncJobData')}
            </Button>
            <Button
              loading={syncing}
              onClick={handleSyncCompanies}
              variant="outline"
              leftSection={<div className="i-mdi:github" />}
            >
              {t('sync.syncCompanyData')}
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          {t('sync.fileImport')}
        </Title>
        <Stack>
          <Select
            label={t('sync.dataType')}
            data={[
              { value: 'job', label: t('sync.jobType') },
              { value: 'company', label: t('sync.companyType') },
            ]}
            value={dataType}
            onChange={(value) => setDataType(value || 'job')}
          />
          <FileInput
            label={t('sync.selectExcelFile')}
            placeholder={t('sync.clickToSelectFile')}
            accept=".xlsx,.xls"
            value={file}
            onChange={setFile}
          />
          <Button loading={syncing} onClick={handleFileImport} disabled={!file}>
            {t('sync.importData')}
          </Button>
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          {t('sync.scheduledTaskConfig')}
        </Title>
        <Stack>
          <Alert
            color={config?.schedule_enabled ? 'green' : 'gray'}
            title={t('sync.scheduledSyncStatus')}
          >
            {config?.schedule_enabled ? t('sync.enabled') : t('sync.disabled')}
          </Alert>
          <Text size="sm">
            {t('sync.cronExpression')}: <code>{config?.schedule_cron}</code>
          </Text>
          <Text size="sm">
            {t('sync.syncJob')}:{' '}
            <Badge color={config?.sync_jobs ? 'green' : 'red'}>
              {config?.sync_jobs ? t('sync.yes') : t('sync.no')}
            </Badge>
          </Text>
          <Text size="sm">
            {t('sync.syncCompany')}:{' '}
            <Badge color={config?.sync_companies ? 'green' : 'red'}>
              {config?.sync_companies ? t('sync.yes') : t('sync.no')}
            </Badge>
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
