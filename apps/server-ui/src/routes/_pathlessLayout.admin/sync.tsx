import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Group,
  Button,
  Stack,
  Badge,
  FileInput,
  Select,
  RingProgress,
  Skeleton,
  Modal,
  Divider,
  Alert,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  syncApi,
  SyncStatus,
  ImportResult,
  ImportError,
  ImportWarning,
} from '@/api/sync';

const renderErrorMessage = (error: ImportError): string => {
  switch (error.error_type) {
    case 'InvalidInteger':
      return t('error.invalidInteger', {
        row: error.row,
        field: error.field,
        value: error.value,
      });
    case 'InvalidFloat':
      return t('error.invalidFloat', {
        row: error.row,
        field: error.field,
        value: error.value,
      });
    case 'MissingRequiredField':
      return t('error.missingRequiredField', {
        row: error.row,
        field: error.field,
      });
    default:
      return String(error);
  }
};

const renderWarningMessage = (warning: ImportWarning): string => {
  switch (warning.error_type) {
    case 'VersionExceeded':
      return t('warning.versionExceeded', {
        file_version: warning.file_version,
        max_supported_version: warning.max_supported_version,
        actual_version: warning.actual_version,
      });
    default:
      return String(warning);
  }
};
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_pathlessLayout/admin/sync')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation('sync');
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<string>('job');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [statusData] = await Promise.all([syncApi.getStatus()]);
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileImport = async () => {
    if (!file) {
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
      setImportResult(result);
      setResultModalOpen(true);
      loadData();
    } catch (error) {
      const errorResult: ImportResult = {
        success: false,
        valid_result: false,
        data_version: 0,
        actual_version: 0,
        lack_columns: [],
        valid_columns: [],
        total: 0,
        imported: 0,
        updated: 0,
        cost_time: 0,
        errors: [
          {
            error_type: 'InvalidInteger',
            row: 0,
            field: String(error),
            value: '',
          },
        ],
        warnings: [],
      };
      setImportResult(errorResult);
      setResultModalOpen(true);
    } finally {
      setSyncing(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderResultModal = () => {
    if (!importResult) return null;

    const isSuccess = importResult.valid_result && importResult.success;

    return (
      <Modal
        opened={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={
          <Title order={4}>
            {isSuccess ? t('importSuccess') : t('importFailed')}
          </Title>
        }
        size="md"
      >
        <Stack gap="md">
          <Group>
            <Text fw={500}>{t('fileVersion')}:</Text>
            <Text>{importResult.data_version}</Text>
            <Text c="dimmed">
              ({t('validationVersion')}: v{importResult.actual_version})
            </Text>
          </Group>

          {importResult.warnings.length > 0 && (
            <>
              {importResult.warnings.map((warning, index) => (
                <Alert key={index} color="yellow" variant="light">
                  {renderWarningMessage(warning)}
                </Alert>
              ))}
            </>
          )}

          {isSuccess ? (
            <>
              <Divider />
              <Group justify="center">
                <RingProgress
                  size={150}
                  thickness={15}
                  sections={[
                    {
                      value:
                        importResult.total > 0
                          ? ((importResult.imported + importResult.updated) /
                              importResult.total) *
                            100
                          : 0,
                      color: 'green',
                    },
                    {
                      value:
                        importResult.total > 0
                          ? ((importResult.total - importResult.imported) /
                              importResult.total) *
                            100
                          : 0,
                      color: 'gray',
                    },
                  ]}
                  label={
                    <Text ta="center" fw={700}>
                      {importResult.imported + importResult.updated}
                      <Text span size="xs" fw={400}>
                        {' '}
                        {t('success')}
                      </Text>
                    </Text>
                  }
                />
                <Stack gap="xs">
                  <Group gap="xs">
                    <Badge
                      color="green"
                      variant="filled"
                      w={16}
                      h={16}
                      style={{ padding: 0 }}
                    />
                    <Text>
                      {t('success')}:{' '}
                      {importResult.imported + importResult.updated}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Badge
                      color="gray"
                      variant="filled"
                      w={16}
                      h={16}
                      style={{ padding: 0 }}
                    />
                    <Text>
                      {t('duplicate')}:{' '}
                      {importResult.total - importResult.imported}
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t('total')}: {importResult.total}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t('duration')}: {formatDuration(importResult.cost_time)}
                  </Text>
                </Stack>
              </Group>
            </>
          ) : (
            <>
              <Divider />
              <Stack gap="xs">
                <Text fw={500} c="red">
                  {t('failureReason')}:
                </Text>
                {importResult.errors.map((error, index) => (
                  <Text key={index} c="red" size="sm">
                    {renderErrorMessage(error)}
                  </Text>
                ))}
                {importResult.valid_columns.length > 0 && (
                  <>
                    <Text fw={500} mt="sm">
                      {t('fieldList')} (
                      {t('fieldCount', {
                        count: importResult.valid_columns.length,
                      })}
                      )
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      {importResult.valid_columns.map((field, index) => (
                        <Badge
                          key={index}
                          color={
                            importResult.lack_columns.includes(field)
                              ? 'red'
                              : 'green'
                          }
                          variant="light"
                        >
                          {field}
                        </Badge>
                      ))}
                    </Group>
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Modal>
    );
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
      <Title order={2}>{t('title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          {t('syncStatus')}
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
                  {t('jobs')}
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
                  {t('companies')}
                </Text>
              </Text>
            }
          />
          <Stack gap="xs">
            <Text size="sm">
              {t('lastSyncJob')}:{' '}
              <Badge color="blue">
                {status?.last_sync_job || t('neverSynced')}
              </Badge>
            </Text>
            <Text size="sm">
              {t('lastSyncCompany')}:{' '}
              <Badge color="green">
                {status?.last_sync_company || t('neverSynced')}
              </Badge>
            </Text>
          </Stack>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          {t('fileImport')}
        </Title>
        <Stack>
          <Select
            label={t('dataType')}
            data={[
              { value: 'job', label: t('jobType') },
              { value: 'company', label: t('companyType') },
            ]}
            value={dataType}
            onChange={(value) => setDataType(value || 'job')}
          />
          <FileInput
            label={t('selectExcelFile')}
            placeholder={t('clickToSelectFile')}
            accept=".xlsx,.xls"
            value={file}
            onChange={setFile}
          />
          <Button loading={syncing} onClick={handleFileImport} disabled={!file}>
            {t('importData')}
          </Button>
        </Stack>
      </Card>

      {renderResultModal()}
    </Stack>
  );
}
