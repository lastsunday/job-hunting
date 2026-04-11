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
import { syncApi, SyncStatus, SyncGitParam } from '@/api/sync';
import { useTranslation } from '../../i18n';

export const Route = createFileRoute('/_pathlessLayout/admin/sync')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<string>('job');

  const loadData = async () => {
    try {
      const [statusData] = await Promise.all([
        syncApi.getStatus(),
      ]);
      setStatus(statusData);
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
          </Stack>
        </Group>
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

    </Stack>
  );
}
