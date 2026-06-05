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
  SimpleGrid,
  Paper,
  ThemeIcon,
  Box,
  SegmentedControl,
  Collapse,
  ActionIcon,
  Loader,
} from '@mantine/core';
import {
  IconDatabase,
  IconBuilding,
  IconPlayerPlay,
  IconPlayerStop,
  IconCalendarClock,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
} from '@tabler/icons-react';
import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
import {
  syncApi,
  SyncStatus,
  ImportResult,
  ImportError,
  ImportWarning,
} from '@/api/sync';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '@/utils/date';
import { taskStatsApi, StatItem, DailyBreakdownItem } from '@/api/statistics';
import DownloadPlansSection from '@/components/sync/DownloadPlansSection';
import RecentTasksSection from '@/components/sync/RecentTasksSection';

export const Route = createFileRoute('/_pathlessLayout/admin/sync')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation(['sync', 'common', 'taskRun']);

  const toPascalCase = (str: string) =>
    str.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('');

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<string>('job');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const [statusDist, setStatusDist] = useState<StatItem[]>([]);
  const [taskStatsDays, setTaskStatsDays] = useState<number | undefined>(30);
  const [typeDist, setTypeDist] = useState<StatItem[]>([]);
  const [dailyCount, setDailyCount] = useState<StatItem[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdownItem[]>([]);
  const [statsOpened, setStatsOpened] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [refreshingStats, setRefreshingStats] = useState(false);

  const loadData = async () => {
    try {
      const statusData = await syncApi.getStatus();
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

  const handleRefreshStatus = async () => {
    setRefreshingStatus(true);
    await loadData();
    setRefreshingStatus(false);
  };

  const handleRefreshStats = () => {
    setRefreshingStats(true);
    Promise.all([
      taskStatsApi.getStatusDistribution(taskStatsDays),
      taskStatsApi.getTypeDistribution(taskStatsDays),
      taskStatsApi.getDailyBreakdown(taskStatsDays),
    ])
      .then(([s, t, b]) => {
        setStatusDist(s);
        setTypeDist(t);
        setDailyBreakdown(b);
      })
      .catch(() => {})
      .finally(() => setRefreshingStats(false));
  };

  useEffect(() => {
    Promise.all([
      taskStatsApi.getStatusDistribution(taskStatsDays),
      taskStatsApi.getTypeDistribution(taskStatsDays),
      taskStatsApi.getDailyCount(taskStatsDays),
      taskStatsApi.getDailyBreakdown(taskStatsDays),
    ])
      .then(([s, t, d, b]) => {
        setStatusDist(s);
        setTypeDist(t);
        setDailyCount(d);
        setDailyBreakdown(b);
      })
      .catch(() => {});
  }, [taskStatsDays]);

  const handleFileImport = async () => {
    if (!file) return;
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
            field: error instanceof Error ? error.message : String(error),
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
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderErrorMessage = (error: ImportError): string => {
    const key = `error${error.error_type}`;
    const params = { row: error.row, field: error.field, value: error.value };
    return t(key, params) || `${error.error_type}: row ${error.row}, field ${error.field}`;
  };

  const renderWarningMessage = (warning: ImportWarning): string => {
    const key = `warning${warning.error_type}`;
    const params = {
      file_version: warning.file_version,
      max_supported_version: warning.max_supported_version,
      actual_version: warning.actual_version,
    };
    return t(key, params) || `${warning.error_type}`;
  };

  const renderResultModal = () => {
    if (!importResult) return null;
    const isSuccess = importResult.valid_result && importResult.success;

    return (
      <Modal
        opened={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={<Title order={4}>{isSuccess ? t('importSuccess') : t('importFailed')}</Title>}
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
                          ? ((importResult.imported + importResult.updated) / importResult.total) * 100
                          : 0,
                      color: 'green',
                    },
                    {
                      value:
                        importResult.total > 0
                          ? ((importResult.total - importResult.imported) / importResult.total) * 100
                          : 0,
                      color: 'gray',
                    },
                  ]}
                  label={
                    <Text ta="center" fw={700}>
                      {importResult.imported + importResult.updated}
                      <Text span size="xs" fw={400}> {t('success')}</Text>
                    </Text>
                  }
                />
                <Stack gap="xs">
                  <Group gap="xs">
                    <Badge color="green" variant="filled" w={16} h={16} style={{ padding: 0 }} />
                    <Text>{t('success')}: {importResult.imported + importResult.updated}</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="gray" variant="filled" w={16} h={16} style={{ padding: 0 }} />
                    <Text>{t('duplicate')}: {importResult.total - importResult.imported}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">{t('total')}: {importResult.total}</Text>
                  <Text size="sm" c="dimmed">{t('duration')}: {formatDuration(importResult.cost_time)}</Text>
                </Stack>
              </Group>
            </>
          ) : (
            <>
              <Divider />
              <Stack gap="xs">
                <Text fw={500} c="red">{t('failureReason')}:</Text>
                {importResult.errors.map((error, index) => (
                  <Text key={index} c="red" size="sm">{renderErrorMessage(error)}</Text>
                ))}
                {importResult.valid_columns.length > 0 && (
                  <>
                    <Text fw={500} mt="sm">
                      {t('fieldList')} ({t('fieldCount', { count: importResult.valid_columns.length })})
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      {importResult.valid_columns.map((field, index) => (
                        <Badge
                          key={index}
                          color={importResult.lack_columns.includes(field) ? 'red' : 'green'}
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
        <Skeleton height={400} radius="md" />
        <Skeleton height={300} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Title order={2}>{t('title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>{t('syncStatus')}</Title>
          <ActionIcon variant="subtle" onClick={handleRefreshStatus} size="sm">
            {refreshingStatus ? <Loader size={16} /> : <IconRefresh size={16} />}
          </ActionIcon>
        </Group>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <Paper p="md" withBorder radius="md">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="blue" variant="light">
                  <IconDatabase size={22} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{t('totalJobs')}</Text>
                  <Text fw={700} size="lg">{status?.total_jobs ?? 0}</Text>
                </div>
              </Group>
            </Paper>
            <Paper p="md" withBorder radius="md">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="green" variant="light">
                  <IconBuilding size={22} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{t('totalCompanies')}</Text>
                  <Text fw={700} size="lg">{status?.total_companies ?? 0}</Text>
                </div>
              </Group>
            </Paper>
            <Paper p="md" withBorder radius="md">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color={status?.scheduler_running ? 'teal' : 'gray'} variant="light">
                  {status?.scheduler_running ? <IconPlayerPlay size={22} /> : <IconPlayerStop size={22} />}
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{t('schedulerStatus')}</Text>
                  <Text fw={700} size="lg">
                    <Badge color={status?.scheduler_running ? 'teal' : 'gray'} variant="filled" size="sm">
                      {status?.scheduler_running ? t('schedulerRunning') : t('schedulerStopped')}
                    </Badge>
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper p="md" withBorder radius="md">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="violet" variant="light">
                  <IconCalendarClock size={22} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{t('lastSync')}</Text>
                  <Text fw={700} size="sm">{status?.last_sync_job ? formatLocalDate(status.last_sync_job) : t('neverSynced')}</Text>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>

          {(() => {
            const total = (status?.total_jobs ?? 0) + (status?.total_companies ?? 0);
            const jobPct = total > 0 ? ((status?.total_jobs ?? 0) / total * 100) : 0;
            const coPct = total > 0 ? ((status?.total_companies ?? 0) / total * 100) : 0;
            return (
              <Paper p="md" withBorder radius="md">
                <Group gap="xl" align="stretch">
                  <Box style={{ width: 220, height: 200, flexShrink: 0 }}>
                    <Text size="sm" fw={500} mb="xs">{t('dataComposition')}</Text>
                    <ReactECharts
                      option={{
                        tooltip: { trigger: 'item' },
                        legend: { show: true, bottom: 0, left: 'center' },
                        series: [{
                          type: 'pie',
                          radius: ['45%', '70%'],
                          center: ['50%', '45%'],
                          avoidLabelOverlap: false,
                          itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
                          label: { show: false },
                          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
                          data: [
                            { value: status?.total_jobs ?? 0, name: t('jobProportion'), itemStyle: { color: '#228be6' } },
                            { value: status?.total_companies ?? 0, name: t('companyProportion'), itemStyle: { color: '#40c057' } },
                          ],
                        }],
                      }}
                      style={{ height: 180 }}
                    />
                  </Box>
                  <Stack justify="center" gap="sm" style={{ flex: 1 }}>
                    <Group gap="xs">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#228be6' }} />
                      <Text size="sm">{t('jobProportion')}: {status?.total_jobs ?? 0} ({jobPct.toFixed(1)}%)</Text>
                    </Group>
                    <Group gap="xs">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#40c057' }} />
                      <Text size="sm">{t('companyProportion')}: {status?.total_companies ?? 0} ({coPct.toFixed(1)}%)</Text>
                    </Group>
                    <Divider />
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">{t('lastSyncJob')}:</Text>
                      <Text size="sm">{status?.last_sync_job ? formatLocalDate(status.last_sync_job) : t('neverSynced')}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">{t('lastSyncCompany')}:</Text>
                      <Text size="sm">{status?.last_sync_company ? formatLocalDate(status.last_sync_company) : t('neverSynced')}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">{t('lastScanJob')}:</Text>
                      <Text size="sm">{status?.last_scan_job ? formatLocalDate(status.last_scan_job) : t('neverSynced')}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">{t('lastSourceUpdateCompany')}:</Text>
                      <Text size="sm">{status?.last_source_update_company ? formatLocalDate(status.last_source_update_company) : t('neverSynced')}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">{t('schedulerStatus')}:</Text>
                      <Badge color={status?.scheduler_running ? 'teal' : 'gray'} size="sm" variant="light" dot>
                        {status?.scheduler_running ? t('schedulerRunning') : t('schedulerStopped')}
                      </Badge>
                    </Group>
                  </Stack>
                </Group>
              </Paper>
            );
          })()}

        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group
          gap="xs"
          wrap="nowrap"
          style={{ cursor: 'pointer' }}
          onClick={() => setStatsOpened((o) => !o)}
        >
          <Title order={4} style={{ whiteSpace: 'nowrap' }}>{t('taskStatistics')}</Title>
          <SegmentedControl
            size="xs"
            value={String(taskStatsDays ?? 'all')}
            onChange={(v) => setTaskStatsDays(v === 'all' ? undefined : Number(v))}
            data={[
              { value: '7', label: t('last7Days') },
              { value: '30', label: t('lastMonth') },
              { value: '90', label: t('lastQuarter') },
              { value: '180', label: t('lastHalfYear') },
              { value: '365', label: t('lastYear') },
              { value: 'all', label: t('allTime') },
            ]}
            style={{ flexShrink: 0 }}
          />
          <Divider orientation="vertical" />
          {(() => {
            const total = statusDist.reduce((s, i) => s + i.value, 0);
            if (total === 0) return <Text size="sm" c="dimmed">{t('noData', { ns: 'common' })}</Text>;
            const finished = statusDist.find((s) => s.name === 'FINISHED')?.value ?? 0;
            const failed = (statusDist.find((s) => s.name === 'ERROR')?.value ?? 0)
              + (statusDist.find((s) => s.name === 'FINISHED_BUT_ERROR')?.value ?? 0);
            const other = total - finished - failed;
            const rate = ((finished / total) * 100).toFixed(1);
            return (
              <>
                <Text size="sm">{t('totalTasks')}: {total}</Text>
                <Text size="sm" c="green">{t('completed')}: {finished} ({rate}%)</Text>
                <Text size="sm" c="red">{t('failedTasks')}: {failed}</Text>
                <Text size="sm" c="dimmed">{t('otherTasks')}: {other}</Text>
                <Box style={{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', minWidth: 60 }}>
                  <div style={{ width: `${rate}%`, height: '100%', backgroundColor: '#40c057' }} />
                  {failed > 0 && <div style={{ width: `${(failed / total) * 100}%`, height: '100%', backgroundColor: '#fa5252' }} />}
                  <div style={{ width: `${(other / total) * 100}%`, height: '100%', backgroundColor: '#868e96' }} />
                </Box>
              </>
            );
          })()}
          <ActionIcon variant="subtle" onClick={(e) => { e.stopPropagation(); handleRefreshStats(); }} size="sm">
            {refreshingStats ? <Loader size={16} /> : <IconRefresh size={16} />}
          </ActionIcon>
          <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {statsOpened ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </Box>
        </Group>

        <Collapse expanded={statsOpened}>
          <Stack gap="md" pt="md">
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Paper p="md" withBorder radius="md">
                <Text size="sm" fw={500} mb="xs">{t('statusDistribution')}</Text>
                {(() => {
                  const allStatuses = ['FINISHED', 'ERROR', 'FINISHED_BUT_ERROR', 'READY', 'RUNNING', 'CANCEL'];
                  const statusColors: Record<string, string> = {
                    FINISHED: '#40c057', ERROR: '#fa5252', FINISHED_BUT_ERROR: '#fd7e14',
                    READY: '#868e96', RUNNING: '#228be6', CANCEL: '#fab005',
                  };
                  const filled = allStatuses.map((s) => ({
                    name: s,
                    value: statusDist.find((d) => d.name === s)?.value ?? 0,
                  }));
                  const hasData = filled.some((d) => d.value > 0);
                  return hasData ? (
                    <ReactECharts
                      option={{
                        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                        legend: { show: false },
                        series: [{
                          type: 'pie',
                          radius: ['30%', '75%'],
                          roseType: 'area',
                          center: ['50%', '45%'],
                          avoidLabelOverlap: true,
                          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
                          label: { show: true, formatter: '{b} ({d}%)', fontSize: 11, fontWeight: 500 },
                          labelLine: { show: true, smooth: true, length: 10, length2: 8 },
                          emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
                          data: filled.map((item) => ({
                            value: item.value,
                            name: t(toPascalCase(item.name), { ns: 'taskRun' }),
                            itemStyle: { color: statusColors[item.name] ?? '#868e96' },
                          })),
                        }],
                      }}
                      style={{ height: 220 }}
                    />
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="xl">{t('noData', { ns: 'common' })}</Text>
                  );
                })()}
              </Paper>

              <Paper p="md" withBorder radius="md">
                <Text size="sm" fw={500} mb="xs">{t('typeDistribution')}</Text>
                {typeDist.length > 0 ? (
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                      legend: { show: false },
                      series: [{
                        type: 'pie',
                        radius: ['30%', '75%'],
                        roseType: 'area',
                        center: ['50%', '45%'],
                        avoidLabelOverlap: true,
                        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
                        label: { show: true, formatter: '{b} ({d}%)', fontSize: 11, fontWeight: 500 },
                        labelLine: { show: true, smooth: true, length: 10, length2: 8 },
                        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
                        data: typeDist.map((item) => ({
                          value: item.value,
                          name: t(toPascalCase(item.name), { ns: 'taskRun' }),
                          itemStyle: { color: ({ JOB_DATA_DOWNLOAD: '#228be6', JOB_DATA_MERGE: '#20c997', COMPANY_DATA_DOWNLOAD: '#4c6ef5', COMPANY_DATA_MERGE: '#15aabf' })[item.name] ?? '#868e96' },
                        })),
                      }],
                    }}
                    style={{ height: 220 }}
                  />
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="xl">{t('noData', { ns: 'common' })}</Text>
                )}
              </Paper>
            </SimpleGrid>

            <Paper p="md" withBorder radius="md">
              <Text size="sm" fw={500} mb="xs">{t('dailyTrend')}</Text>
              {dailyBreakdown.length > 0 ? (() => {
                const dates = [...new Set(dailyBreakdown.map((d) => d.date))].sort();
                const statusOrder = ['FINISHED', 'FINISHED_BUT_ERROR', 'ERROR', 'RUNNING', 'READY', 'CANCEL'];
                const statusColors: Record<string, string> = {
                  FINISHED: '#40c057', FINISHED_BUT_ERROR: '#fd7e14',
                  ERROR: '#fa5252', RUNNING: '#228be6',
                  READY: '#868e96', CANCEL: '#fab005',
                };
                const getValue = (date: string, status: string) =>
                  dailyBreakdown.find((d) => d.date === date && d.status === status)?.value ?? 0;
                return (
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'axis' },
                      legend: { show: true, bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10 },
                      grid: { left: '3%', right: '4%', bottom: '22%', containLabel: true },
                      xAxis: { type: 'category', data: dates.map((d) => d.slice(5)), axisLabel: { fontSize: 10 } },
                      yAxis: { type: 'value', minInterval: 1 },
                      series: [
                        ...statusOrder.map((status) => ({
                          name: t(toPascalCase(status), { ns: 'taskRun' }),
                          type: 'bar',
                          stack: 'total',
                          barMaxWidth: 36,
                          itemStyle: { color: statusColors[status] ?? '#868e96', borderRadius: 0 },
                          data: dates.map((date) => getValue(date, status)),
                        })),
                        {
                          name: '',
                          type: 'bar',
                          stack: 'total',
                          barMaxWidth: 36,
                          itemStyle: { color: 'transparent' },
                          label: {
                            show: true,
                            position: 'top',
                            formatter: '{c}',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#333',
                          },
                          data: dates.map((date) =>
                            statusOrder.reduce((sum, s) => sum + getValue(date, s), 0)
                          ),
                        },
                      ],
                    }}
                    style={{ height: 260 }}
                  />
                );
              })() : (
                <Text size="sm" c="dimmed" ta="center" py="xl">{t('noData', { ns: 'common' })}</Text>
              )}
            </Paper>
          </Stack>
        </Collapse>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">{t('fileImport')}</Title>
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

      <DownloadPlansSection />
      <RecentTasksSection />

      {renderResultModal()}
    </Stack>
  );
}
