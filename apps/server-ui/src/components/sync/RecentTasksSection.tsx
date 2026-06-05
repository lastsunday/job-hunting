import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Popover,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  CopyButton,
  ActionIcon,
  Loader,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { taskApi, TaskRunDetail } from '@/api/task';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '@/utils/date';

const TYPE_COLOR: Record<string, string> = {
  JobDataDownload: 'blue',
  CompanyDataDownload: 'cyan',
  JobDataMerge: 'violet',
  CompanyDataMerge: 'orange',
};

const TYPE_ICON: Record<string, string> = {
  JobDataDownload: 'i-mdi:download-box-outline',
  CompanyDataDownload: 'i-mdi:download-box-outline',
  JobDataMerge: 'i-mdi:call-merge',
  CompanyDataMerge: 'i-mdi:call-merge',
};

const STATUS_COLOR: Record<string, string> = {
  Ready: 'blue',
  Running: 'indigo',
  Finished: 'green',
  FinishedButError: 'yellow',
  Error: 'red',
  Cancel: 'gray',
};

const STATUS_ICON: Record<string, string> = {
  Ready: 'i-mdi:clock-outline',
  Running: 'i-mdi:play-circle-outline',
  Finished: 'i-mdi:check-circle-outline',
  FinishedButError: 'i-mdi:alert-circle-outline',
  Error: 'i-mdi:close-circle-outline',
  Cancel: 'i-mdi:cancel',
};

function ErrorPopover({ value }: { value: string }) {
  const display = value?.length > 8 ? value.substring(0, 8) : value;
  return (
    <Popover width={400} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Text size="sm" style={{ cursor: 'pointer' }} truncate="end" maw={120}>
          {display}
        </Text>
      </Popover.Target>
      <Popover.Dropdown>
        <Group gap={4}>
          <Text size="sm" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            {value}
          </Text>
          <CopyButton value={value}>
            {({ copied, copy }) => (
              <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" size="sm" onClick={copy}>
                <div className={copied ? 'i-mdi:check' : 'i-mdi:content-copy'} />
              </ActionIcon>
            )}
          </CopyButton>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

export default function RecentTasksSection() {
  const { t } = useTranslation(['sync', 'common', 'taskRun']);
  const navigate = useNavigate();

  const [items, setItems] = useState<TaskRunDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const result = await taskApi.search({ page: { num: 1, size: 5 } });
      setItems(result.items);
    } catch (error) {
      console.error('Failed to load recent tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await taskApi.search({ page: { num: 1, size: 5 } });
      setItems(result.items);
    } catch (error) {
      console.error('Failed to refresh recent tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderRow = (item: TaskRunDetail, index: number) => {
    const isDownload = item.type?.endsWith('Download');
    const isMerge = item.type?.endsWith('Merge');

    return (
      <Table.Tr key={item.id}>
        <Table.Td>
          <Text size="sm">{index + 1}</Text>
        </Table.Td>
        <Table.Td>
          {item.type ? (
            <Badge
              size="sm"
              color={TYPE_COLOR[item.type] || 'gray'}
              leftSection={<div className={`${TYPE_ICON[item.type] || ''} text-base`} />}
            >
              {t(item.type, { ns: 'taskRun' })}
            </Badge>
          ) : (
            <Text size="sm">-</Text>
          )}
        </Table.Td>
        <Table.Td>
          {item.status ? (
            <Badge
              size="sm"
              color={STATUS_COLOR[item.status] || 'gray'}
              leftSection={<div className={`${STATUS_ICON[item.status] || ''} text-base`} />}
            >
              {t(item.status, { ns: 'taskRun' })}
            </Badge>
          ) : (
            <Text size="sm">-</Text>
          )}
        </Table.Td>
        <Table.Td>
          <Stack gap={2}>
            {isDownload && (
              <>
                {item.detail_user_name && item.detail_repo_name && (
                  <Text size="sm">
                    <span className="i-mdi:git-repository inline-flex align-middle" />
                    {' '}{t('repoLabel', { ns: 'taskRun' })}{item.detail_user_name}/{item.detail_repo_name}
                  </Text>
                )}
                {item.detail_datetime && (
                  <Text size="sm">
                    <span className="i-mdi:calendar-clock inline-flex align-middle" />
                    {' '}{t('dateLabel', { ns: 'taskRun' })}{formatLocalDate(item.detail_datetime)?.slice(0, 10) || '-'}
                  </Text>
                )}
                {item.data_id && (
                  <Group gap={4}>
                    <span className="i-mdi:file inline-flex align-middle" />
                    <Text size="sm">{t('fileIdLabel', { ns: 'taskRun' })}</Text>
                    <ErrorPopover value={item.data_id} />
                  </Group>
                )}
                {item.detail_seq != null && (
                  <Text size="sm">
                    <span className="i-mdi:view-sequential inline-flex align-middle" />
                    {' '}{t('seqLabel', { ns: 'taskRun' })}{item.detail_seq}
                  </Text>
                )}
              </>
            )}
            {isMerge && (
              <>
                {item.detail_user_name && item.detail_repo_name && (
                  <Text size="sm">
                    <span className="i-mdi:git-repository inline-flex align-middle" />
                    {' '}{t('repoLabel', { ns: 'taskRun' })}{item.detail_user_name}/{item.detail_repo_name}
                  </Text>
                )}
                {item.detail_datetime && (
                  <Text size="sm">
                    <span className="i-mdi:calendar-clock inline-flex align-middle" />
                    {' '}{t('dateLabel', { ns: 'taskRun' })}{formatLocalDate(item.detail_datetime)?.slice(0, 10) || '-'}
                  </Text>
                )}
                {item.data_id && (
                  <Group gap={4}>
                    <span className="i-mdi:file inline-flex align-middle" />
                    <Text size="sm">{t('fileIdLabel', { ns: 'taskRun' })}</Text>
                    <ErrorPopover value={item.data_id} />
                  </Group>
                )}
                {item.detail_data_count != null && (
                  <Text size="sm">
                    <span className="i-mdi:database-arrow-up inline-flex align-middle" />
                    {' '}{t('dataCountLabel', { ns: 'taskRun' })}{item.detail_data_count}
                  </Text>
                )}
              </>
            )}
            {!isDownload && !isMerge && (
              <Text size="sm" c="dimmed">-</Text>
            )}
          </Stack>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{item.cost_time != null ? `${item.cost_time}ms` : '-'}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{item.retry_count ?? '-'}</Text>
        </Table.Td>
        <Table.Td>
          {item.error_reason ? (
            <ErrorPopover value={item.error_reason} />
          ) : (
            <Text size="sm">-</Text>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {item.update_datetime ? formatLocalDate(item.update_datetime) : '-'}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {item.create_datetime ? formatLocalDate(item.create_datetime) : '-'}
          </Text>
        </Table.Td>
      </Table.Tr>
    );
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>{t('recentTasks')}</Title>
          <Group gap="xs">
            <ActionIcon variant="subtle" onClick={handleRefresh} size="sm">
              {refreshing ? <Loader size={16} /> : <IconRefresh size={16} />}
            </ActionIcon>
            <Button variant="light" size="sm" onClick={() => navigate({ to: '/admin/task' })}>
              {t('viewAllTasks')}
            </Button>
          </Group>
        </Group>

      {loading ? (
        <Skeleton height={200} radius="md" />
      ) : items.length === 0 ? (
        <Text c="dimmed" py="xl" ta="center">{t('noTasks')}</Text>
      ) : (
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 40 }}>#</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>{t('type')}</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>{t('status')}</Table.Th>
                <Table.Th style={{ minWidth: 200 }}>{t('taskSummary')}</Table.Th>
                <Table.Th style={{ minWidth: 80 }}>{t('costTime')}</Table.Th>
                <Table.Th style={{ minWidth: 60 }}>{t('retryCount')}</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>{t('errorReason')}</Table.Th>
                <Table.Th style={{ minWidth: 140 }}>{t('updateDatetime')}</Table.Th>
                <Table.Th style={{ minWidth: 140 }}>{t('createDatetime')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{items.map(renderRow)}</Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
}
