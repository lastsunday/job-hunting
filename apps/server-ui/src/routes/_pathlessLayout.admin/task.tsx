import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Group,
  Button,
  Stack,
  MultiSelect,
  Select,
  Badge,
  Table,
  Pagination,
  Skeleton,
  ScrollArea,
  CopyButton,
  ActionIcon,
  Popover,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useEffect, useState } from 'react';
import { taskApi, TaskRunDetail, TaskType, TaskStatus } from '@/api/task';
import { handleApiError } from '@/api/error';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '@/utils/date';
import dayjs from 'dayjs';

export const Route = createFileRoute('/_pathlessLayout/admin/task')({
  component: RouteComponent,
});

interface SearchParam {
  page: { num: number; size: number };
  type_list?: TaskType[];
  status_list?: TaskStatus[];
  start_datetime_for_create?: string;
  end_datetime_for_create?: string;
  start_datetime_for_update?: string;
  end_datetime_for_update?: string;
}

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

const TASK_TYPE_VALUES: TaskType[] = [
  'JobDataDownload',
  'JobDataMerge',
  'CompanyDataDownload',
  'CompanyDataMerge',
];

const TASK_STATUS_VALUES: TaskStatus[] = [
  'Ready',
  'Running',
  'Finished',
  'FinishedButError',
  'Error',
  'Cancel',
];

function IdCell({ id }: { id: string }) {
  const display = id?.length > 8 ? id.substring(0, 8) : id;
  return (
    <Popover width={300} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Text size="sm" style={{ cursor: 'pointer' }} truncate="end" maw={100}>
          {display}
        </Text>
      </Popover.Target>
      <Popover.Dropdown>
        <Group gap={4}>
          <Text size="sm" style={{ wordBreak: 'break-all' }}>{id}</Text>
          <CopyButton value={id}>
            {({ copied, copy }) => (
              <ActionIcon
                color={copied ? 'teal' : 'gray'}
                variant="subtle"
                size="sm"
                onClick={copy}
              >
                <div className={copied ? 'i-mdi:check' : 'i-mdi:content-copy'} />
              </ActionIcon>
            )}
          </CopyButton>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

function RouteComponent() {
  const { t } = useTranslation(['taskRun', 'common']);
  const [items, setItems] = useState<TaskRunDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);

  const [typeList, setTypeList] = useState<TaskType[]>([]);
  const [statusList, setStatusList] = useState<TaskStatus[]>([]);
  const [createStart, setCreateStart] = useState<Date | null>(null);
  const [createEnd, setCreateEnd] = useState<Date | null>(null);
  const [updateStart, setUpdateStart] = useState<Date | null>(null);
  const [updateEnd, setUpdateEnd] = useState<Date | null>(null);

  const typeOptions = TASK_TYPE_VALUES.map((v) => ({
    value: v,
    label: t(v),
  }));

  const statusOptions = TASK_STATUS_VALUES.map((v) => ({
    value: v,
    label: t(v),
  }));

  const loadItems = async (p?: number) => {
    setLoading(true);
    try {
      const currentPage = p ?? page;
      const param: SearchParam = {
        page: { num: currentPage, size: pageSize },
        type_list: typeList.length > 0 ? typeList : undefined,
        status_list: statusList.length > 0 ? statusList : undefined,
        start_datetime_for_create: createStart
          ? dayjs(createStart).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
          : undefined,
        end_datetime_for_create: createEnd
          ? dayjs(createEnd).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
          : undefined,
        start_datetime_for_update: updateStart
          ? dayjs(updateStart).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
          : undefined,
        end_datetime_for_update: updateEnd
          ? dayjs(updateEnd).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
          : undefined,
      };
      const result = await taskApi.search(param);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(1);
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadItems(1);
  };

  const handleReset = () => {
    setTypeList([]);
    setStatusList([]);
    setCreateStart(null);
    setCreateEnd(null);
    setUpdateStart(null);
    setUpdateEnd(null);
    setPage(1);
    loadItems(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (value) {
      setPageSize(Number(value));
      setPage(1);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && items.length === 0) {
    return (
      <Stack>
        <Skeleton height={50} radius="md" />
        <Skeleton height={400} radius="md" />
      </Stack>
    );
  }

  const rows = items.map((item, index) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Text size="sm">{(page - 1) * pageSize + index + 1}</Text>
      </Table.Td>
      <Table.Td>
        <IdCell id={item.id} />
      </Table.Td>
      <Table.Td>
        {item.type ? (
          <Badge
            size="md"
            color={TYPE_COLOR[item.type] || 'gray'}
            leftSection={<div className={`${TYPE_ICON[item.type] || ''} text-base`} />}
          >
            {t(item.type)}
          </Badge>
        ) : (
          <Text size="sm">{t('common:na')}</Text>
        )}
      </Table.Td>
      <Table.Td>
        {item.status ? (
          <Badge
            size="md"
            color={STATUS_COLOR[item.status] || 'gray'}
            leftSection={<div className={`${STATUS_ICON[item.status] || ''} text-base`} />}
          >
            {t(item.status)}
          </Badge>
        ) : (
          <Text size="sm">{t('common:na')}</Text>
        )}
      </Table.Td>
      <Table.Td>
        {renderTaskSummary(item, t)}
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {item.cost_time != null ? `${item.cost_time} ms` : '-'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.retry_count ?? '-'}</Text>
      </Table.Td>
      <Table.Td>
        {item.error_reason ? (
          <Popover width={400} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Text size="sm" style={{ cursor: 'pointer' }} truncate="end" maw={150}>
                {item.error_reason}
              </Text>
            </Popover.Target>
            <Popover.Dropdown>
              <Group gap={4}>
                <Text size="sm" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                  {item.error_reason}
                </Text>
                <CopyButton value={item.error_reason}>
                  {({ copied, copy }) => (
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="subtle"
                      size="sm"
                      onClick={copy}
                    >
                      <div className={copied ? 'i-mdi:check' : 'i-mdi:content-copy'} />
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Popover.Dropdown>
          </Popover>
        ) : (
          <Text size="sm">-</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {item.create_datetime
            ? formatLocalDate(item.create_datetime)
            : '-'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {item.update_datetime
            ? formatLocalDate(item.update_datetime)
            : '-'}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={2}>{t('title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group gap="md" align="flex-end">
          <MultiSelect
            label={t('type')}
            placeholder={t('typePlaceholder')}
            data={typeOptions}
            value={typeList}
            onChange={setTypeList as any}
            clearable
            searchable
            style={{ minWidth: 200 }}
          />
          <MultiSelect
            label={t('status')}
            placeholder={t('statusPlaceholder')}
            data={statusOptions}
            value={statusList}
            onChange={setStatusList as any}
            clearable
            searchable
            style={{ minWidth: 180 }}
          />
          <Stack gap={2}>
            <Text size="sm">{t('createDatetime')}</Text>
            <Group gap={4} wrap="nowrap">
              <DateTimePicker
                placeholder={t('createDatetimePlaceholder')}
                value={createStart}
                onChange={(v) => setCreateStart(v ?? null)}
                clearable
                valueFormat="YYYY-MM-DD HH:mm"
              />
              <Text size="sm" c="dimmed" style={{ paddingTop: 6 }}>~</Text>
              <DateTimePicker
                placeholder={t('createDatetimePlaceholder')}
                value={createEnd}
                onChange={(v) => setCreateEnd(v ?? null)}
                clearable
                valueFormat="YYYY-MM-DD HH:mm"
              />
            </Group>
          </Stack>
          <Stack gap={2}>
            <Text size="sm">{t('updateDatetime')}</Text>
            <Group gap={4} wrap="nowrap">
              <DateTimePicker
                placeholder={t('updateDatetimePlaceholder')}
                value={updateStart}
                onChange={(v) => setUpdateStart(v ?? null)}
                clearable
                valueFormat="YYYY-MM-DD HH:mm"
              />
              <Text size="sm" c="dimmed" style={{ paddingTop: 6 }}>~</Text>
              <DateTimePicker
                placeholder={t('updateDatetimePlaceholder')}
                value={updateEnd}
                onChange={(v) => setUpdateEnd(v ?? null)}
                clearable
                valueFormat="YYYY-MM-DD HH:mm"
              />
            </Group>
          </Stack>
          <Button onClick={handleSearch}>{t('common:search')}</Button>
          <Button variant="default" onClick={handleReset}>
            {t('common:reset')}
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 50 }}>#</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>{t('id')}</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>{t('type')}</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>{t('status')}</Table.Th>
                <Table.Th style={{ minWidth: 280 }}>{t('taskSummary')}</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>{t('costTime')}</Table.Th>
                <Table.Th style={{ minWidth: 80 }}>{t('retryCount')}</Table.Th>
                <Table.Th style={{ minWidth: 150 }}>{t('errorReason')}</Table.Th>
                <Table.Th style={{ minWidth: 140 }}>{t('createDatetime')}</Table.Th>
                <Table.Th style={{ minWidth: 140 }}>{t('updateDatetime')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </ScrollArea>

        {total > 0 && (
          <Group justify="center" mt="md">
            <Text size="sm" c="dimmed">
              {total} {t('total')}
            </Text>
            <Select
              value={String(pageSize)}
              onChange={handlePageSizeChange}
              data={['50', '100', '200'].map((v) => ({
                value: v,
                label: `${v} ${t('perPage')}`,
              }))}
              size="sm"
              style={{ width: 130 }}
            />
            <Pagination
              total={Math.max(1, totalPages)}
              value={page}
              onChange={setPage}
              size="sm"
            />
          </Group>
        )}
      </Card>
    </Stack>
  );
}

function renderTaskSummary(item: TaskRunDetail, t: (k: string) => string) {
  const isDownload = item.type?.endsWith('Download');
  const isMerge = item.type?.endsWith('Merge');

  return (
    <Stack gap={4}>
      {isDownload && (
        <>
          {item.detail_user_name && item.detail_repo_name && (
            <Text size="sm">
              <span className="i-mdi:git-repository inline-flex align-middle" />
              {' '}{t('repoLabel')}{item.detail_user_name}/{item.detail_repo_name}
            </Text>
          )}
          {item.detail_datetime && (
            <Text size="sm">
              <span className="i-mdi:calendar-clock inline-flex align-middle" />
              {' '}{t('dateLabel')}{formatLocalDate(item.detail_datetime)?.slice(0, 10) || '-'}
            </Text>
          )}
          {item.data_id && (
            <Group gap={4}>
              <span className="i-mdi:file inline-flex align-middle" />
              <Text size="sm">{t('fileIdLabel')}</Text>
              <ErrorPopover value={item.data_id!} />
            </Group>
          )}
          {item.detail_seq != null && (
            <Text size="sm">
              <span className="i-mdi:view-sequential inline-flex align-middle" />
              {' '}{t('seqLabel')}{item.detail_seq}
            </Text>
          )}
        </>
      )}
      {isMerge && (
        <>
          {item.detail_user_name && item.detail_repo_name && (
            <Text size="sm">
              <span className="i-mdi:git-repository inline-flex align-middle" />
              {' '}{t('repoLabel')}{item.detail_user_name}/{item.detail_repo_name}
            </Text>
          )}
          {item.detail_datetime && (
            <Text size="sm">
              <span className="i-mdi:calendar-clock inline-flex align-middle" />
              {' '}{t('dateLabel')}{formatLocalDate(item.detail_datetime)?.slice(0, 10) || '-'}
            </Text>
          )}
          {item.data_id && (
            <Group gap={4}>
              <span className="i-mdi:file inline-flex align-middle" />
              <Text size="sm">{t('fileIdLabel')}</Text>
              <ErrorPopover value={item.data_id!} />
            </Group>
          )}
          {item.detail_data_count != null && (
            <Text size="sm">
              <span className="i-mdi:database-arrow-up inline-flex align-middle" />
              {' '}{t('dataCountLabel')}{item.detail_data_count}
            </Text>
          )}
        </>
      )}
      {!isDownload && !isMerge && (
        <Text size="sm" c="dimmed">-</Text>
      )}
    </Stack>
  );
}

function ErrorPopover({ value }: { value: string }) {
  const display = value?.length > 8 ? value.substring(0, 8) : value;
  return (
    <Popover width={300} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Text size="sm" style={{ cursor: 'pointer' }} truncate="end" maw={100}>
          {display}
        </Text>
      </Popover.Target>
      <Popover.Dropdown>
        <Group gap={4}>
          <Text size="sm" style={{ wordBreak: 'break-all' }}>{value}</Text>
          <CopyButton value={value}>
            {({ copied, copy }) => (
              <ActionIcon
                color={copied ? 'teal' : 'gray'}
                variant="subtle"
                size="sm"
                onClick={copy}
              >
                <div className={copied ? 'i-mdi:check' : 'i-mdi:content-copy'} />
              </ActionIcon>
            )}
          </CopyButton>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
