import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Group,
  Button,
  Stack,
  TextInput,
  Table,
  Modal,
  Pagination,
  Skeleton,
  Drawer,
  Divider,
  Select,
  Checkbox,
  Badge,
  Tooltip,
  Switch,
  ScrollArea,
  UnstyledButton,
  ActionIcon,
  PasswordInput,
} from '@mantine/core';
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import classes from '../../task-plan.module.css';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import {
  taskDataPlanApi,
  TaskDataPlanDetail,
  CreateTaskDataPlanRequest,
  UpdateTaskDataPlanRequest,
} from '@/api/taskDataPlan';
import { handleApiError } from '@/api/error';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '@/utils/date';
import { getNextCronTimes, formatCronTime } from '@/utils/cron';

export const Route = createFileRoute('/_pathlessLayout/admin/task-plan/data-plan/')({
  component: RouteComponent,
});

interface SearchParam {
  page: { num: number; size: number };
  username?: string;
  repo_name?: string;
  repo_type?: string;
  enable?: boolean;
}

interface ApiPageResult<T> {
  items: T[];
  total: number;
}

function SortableTh({
  children,
  field,
  currentOrderBy,
  currentOrderDir,
  onSort,
  minWidth = 80,
}: {
  children: React.ReactNode;
  field: string;
  currentOrderBy: string;
  currentOrderDir: string;
  onSort: (field: string) => void;
  minWidth?: number | string;
}) {
  const sorted = currentOrderBy === field;
  const reversed = sorted && currentOrderDir === 'asc';
  const Icon = sorted
    ? reversed
      ? IconChevronUp
      : IconChevronDown
    : IconSelector;
  return (
    <Table.Th style={{ minWidth }}>
      <UnstyledButton onClick={() => onSort(field)}>
        <Group justify="space-between" gap={4}>
          <Text fw={500} fz="sm">
            {children}
          </Text>
          <Icon size={14} stroke={1.5} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

const TASK_TYPE_LABELS: Record<string, string> = {
  JOB_DATA_DOWNLOAD: 'jobDataDownload',
  COMPANY_DATA_DOWNLOAD: 'companyDataDownload',
  JobDataDownload: 'jobDataDownload',
  CompanyDataDownload: 'companyDataDownload',
};

const TASK_TYPE_TO_FORM: Record<string, string> = {
  JobDataDownload: 'JOB_DATA_DOWNLOAD',
  CompanyDataDownload: 'COMPANY_DATA_DOWNLOAD',
};

function parsePlanConfig(config?: string | null): Record<string, unknown> {
  try {
    return config ? JSON.parse(config) : {};
  } catch {
    return {};
  }
}

function TaskTypeCell({ config }: { config?: string | null }) {
  const { t } = useTranslation(['taskDataPlan', 'taskPlan', 'common']);
  const cfg = parsePlanConfig(config);
  const list = Array.isArray(cfg.task_type_list)
    ? (cfg.task_type_list as string[])
    : [];
  if (list.length === 0) return <Text size="sm">{t('common:na')}</Text>;
  return (
    <Group gap={4}>
      {list.map((v) => (
        <Badge key={v} size="sm" color="cyan">
          {t(TASK_TYPE_LABELS[v] || v)}
        </Badge>
      ))}
    </Group>
  );
}

function EnableBadge({ enable }: { enable?: boolean }) {
  const { t } = useTranslation(['taskDataPlan']);
  return (
    <Badge color={enable ? 'green' : 'gray'}>
      {enable ? t('enabled') : t('disabled')}
    </Badge>
  );
}

function RouteComponent() {
  const { t } = useTranslation(['taskDataPlan', 'taskPlan', 'common']);
  const [items, setItems] = useState<TaskDataPlanDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchRepoName, setSearchRepoName] = useState('');
  const [searchEnable, setSearchEnable] = useState<string>('');
  const [openedModal, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [openedDelete, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [openedView, { open: openView, close: closeView }] =
    useDisclosure(false);
  const [editingItem, setEditingItem] = useState<TaskDataPlanDetail | null>(null);
  const [viewingItem, setViewingItem] = useState<TaskDataPlanDetail | null>(null);
  const [deletingItem, setDeletingItem] = useState<TaskDataPlanDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const CRON_PRESETS: { label: string; value: string }[] = [
    { label: t('taskPlan:cronEvery30Sec'), value: '*/30 * * * * *' },
    { label: t('taskPlan:cronEveryMin'), value: '0 * * * * *' },
    { label: t('taskPlan:cronEvery5Min'), value: '0 */5 * * * *' },
    { label: t('taskPlan:cronEvery30Min'), value: '0 */30 * * * *' },
    { label: t('taskPlan:cronEveryHour'), value: '0 0 * * * *' },
    { label: t('taskPlan:cronEvery6Hour'), value: '0 */6 * * * *' },
    { label: t('taskPlan:cronDaily'), value: '0 0 0 * * *' },
    { label: t('taskPlan:cronWeekly'), value: '0 0 0 * * 0' },
    { label: t('taskPlan:cronMonthly'), value: '0 0 0 1 * *' },
  ];

  const PRESET_VALUES = CRON_PRESETS.map((p) => p.value);

  const CronCell = ({ cron }: { cron?: string | null }) => {
    const times = cron ? getNextCronTimes(cron, 5) : null;
    const preset = CRON_PRESETS.find((p) => p.value === cron);
    const label = preset?.label ?? null;
    const inner = (
      <Text size="sm">
        {label ? `${label} (${cron})` : cron || t('common:na')}
      </Text>
    );
    if (!times) return inner;
    return (
      <Tooltip
        label={
          <Stack gap={2}>
            <Text size="xs" fw={500}>{t('nextRun')}:</Text>
            {times.map((d, i) => (
              <Text key={i} size="xs">{formatCronTime(d)}</Text>
            ))}
          </Stack>
        }
        withArrow
      >
        {inner}
      </Tooltip>
    );
  };

  const [formData, setFormData] = useState<{
    enable: boolean;
    cron: string;
    cronIsCustom: boolean;
    username: string;
    repo_name: string;
    repo_type: string;
    token: string;
    task_type_list: string[];
  }>({
    enable: true,
    cron: '',
    cronIsCustom: false,
    username: '',
    repo_name: '',
    repo_type: 'GITHUB',
    token: '',
    task_type_list: [],
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const param: SearchParam = {
        page: { num: page, size: pageSize },
        username: searchUsername || undefined,
        repo_name: searchRepoName || undefined,
        enable:
          searchEnable === 'true'
            ? true
            : searchEnable === 'false'
              ? false
              : undefined,
      };
      const result = await taskDataPlanApi.search(param);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadItems();
  };

  const handleReset = () => {
    setSearchUsername('');
    setSearchRepoName('');
    setSearchEnable('');
    setPage(1);
    loadItems();
  };

  const handlePageSizeChange = (value: string | null) => {
    if (value) {
      setPageSize(Number(value));
      setPage(1);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      enable: true,
      cron: '',
      cronIsCustom: false,
      username: '',
      repo_name: '',
      repo_type: 'GITHUB',
      token: '',
      task_type_list: [],
    });
    openModal();
  };

  const handleEdit = (item: TaskDataPlanDetail) => {
    const cfg = parsePlanConfig(item.config);
    const taskTypeList: string[] = Array.isArray(cfg.task_type_list)
      ? (cfg.task_type_list as string[]).map((v) => TASK_TYPE_TO_FORM[v] || v)
      : [];
    const cronVal = item.cron || '';
    setEditingItem(item);
    setFormData({
      enable: item.enable ?? true,
      cron: cronVal,
      cronIsCustom: cronVal !== '' && !PRESET_VALUES.includes(cronVal),
      username: item.username ?? '',
      repo_name: item.repo_name ?? '',
      repo_type: item.repo_type ?? 'GITHUB',
      token: (cfg.token as string) || '',
      task_type_list: taskTypeList,
    });
    openModal();
  };

  const handleView = (item: TaskDataPlanDetail) => {
    setViewingItem(item);
    openView();
  };

  const handleDelete = (item: TaskDataPlanDetail) => {
    setDeletingItem(item);
    openDelete();
  };

  const handleFormSubmit = async () => {
    if (!formData.cron) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateCronRequired') });
      return;
    }
    if (formData.task_type_list.length === 0) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateTaskTypeRequired') });
      return;
    }
    if (!formData.username) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateUserNameRequired') });
      return;
    }
    if (!formData.repo_name) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateRepoNameRequired') });
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        const data: UpdateTaskDataPlanRequest = {
          enable: formData.enable,
          cron: formData.cron || undefined,
          username: formData.username || undefined,
          repo_name: formData.repo_name || undefined,
          repo_type: formData.repo_type || undefined,
          token: formData.token || undefined,
          task_type_list:
            formData.task_type_list.length > 0
              ? formData.task_type_list
              : undefined,
        };
        await taskDataPlanApi.update(editingItem.id, data);
        showNotification({
          color: 'green',
          title: t('common:success'),
          message: t('updateSuccess'),
        });
      } else {
        const data: CreateTaskDataPlanRequest = {
          enable: formData.enable,
          cron: formData.cron || undefined,
          username: formData.username || undefined,
          repo_name: formData.repo_name || undefined,
          repo_type: formData.repo_type || undefined,
          token: formData.token || undefined,
          task_type_list:
            formData.task_type_list.length > 0
              ? formData.task_type_list
              : undefined,
        };
        await taskDataPlanApi.create(data);
        showNotification({
          color: 'green',
          title: t('common:success'),
          message: t('createSuccess'),
        });
      }
      closeModal();
      loadItems();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await taskDataPlanApi.delete(deletingItem.id);
      showNotification({
        color: 'green',
        title: t('common:success'),
        message: t('deleteSuccess'),
      });
      closeDelete();
      loadItems();
    } catch (error) {
      handleApiError(error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const renderModal = () => (
    <Modal
      opened={openedModal}
      onClose={closeModal}
      title={
        <Title order={4}>
          {editingItem ? t('editPlan') : t('addPlan')}
        </Title>
      }
      size="lg"
    >
      <Stack gap="md">
        <Group>
          <Text>{t('enable')}</Text>
          <Switch
            checked={formData.enable}
            onChange={(e) =>
              setFormData({ ...formData, enable: e.currentTarget.checked })
            }
          />
        </Group>
        <Select
          label={t('cron')}
          placeholder={t('taskPlan:cronPlaceholder')}
          data={[
            ...CRON_PRESETS,
            { label: t('taskPlan:cronCustom'), value: '__custom__' },
          ]}
          value={formData.cronIsCustom ? '__custom__' : formData.cron || null}
          onChange={(value) => {
            if (value === '__custom__') {
              setFormData({ ...formData, cronIsCustom: true, cron: '' });
            } else if (value) {
              setFormData({ ...formData, cronIsCustom: false, cron: value });
            }
          }}
          required
        />
        {formData.cronIsCustom && (
          <TextInput
            label={t('cron')}
            placeholder={t('taskPlan:cronPlaceholder')}
            value={formData.cron}
            onChange={(e) =>
              setFormData({ ...formData, cron: e.currentTarget.value })
            }
          />
        )}
        <Select
          label={t('repoType')}
          data={[
            { value: 'GITHUB', label: t('github') },
          ]}
          value={formData.repo_type}
          onChange={(value) =>
            setFormData({ ...formData, repo_type: value || 'GITHUB' })
          }
          required
        />
        <TextInput
          label={t('username')}
          placeholder={t('userNamePlaceholder')}
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.currentTarget.value })
          }
          required
        />
        <TextInput
          label={t('repoName')}
          placeholder={t('repoNamePlaceholder')}
          value={formData.repo_name}
          onChange={(e) =>
            setFormData({ ...formData, repo_name: e.currentTarget.value })
          }
          required
        />
        <PasswordInput
          label={t('token')}
          value={formData.token}
          onChange={(e) =>
            setFormData({ ...formData, token: e.currentTarget.value })
          }
        />
        <Checkbox.Group
          label={t('taskType')}
          value={formData.task_type_list}
          onChange={(value) =>
            setFormData({
              ...formData,
              task_type_list: value,
            })
          }
          withAsterisk
        >
          <Group>
            <Checkbox value="JOB_DATA_DOWNLOAD" label={t('jobDataDownload')} />
            <Checkbox value="COMPANY_DATA_DOWNLOAD" label={t('companyDataDownload')} />
          </Group>
        </Checkbox.Group>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeModal}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleFormSubmit} loading={submitting}>
            {t('common:submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  const renderViewDrawer = () => (
    <Drawer
      opened={openedView}
      onClose={closeView}
      title={
        <Title order={4}>{t('planDetails')}</Title>
      }
      size="lg"
      position="right"
    >
      {viewingItem && (() => {
        const cfg = parsePlanConfig(viewingItem.config);
        return (
        <Stack gap="md">
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('id')}:
            </Text>
            <Text size="sm">{viewingItem.id}</Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('username')}:
            </Text>
            <Text size="sm">{viewingItem.username || t('common:na')}</Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('repoName')}:
            </Text>
            <Text size="sm">{viewingItem.repo_name || t('common:na')}</Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('repoType')}:
            </Text>
            <Badge size="sm" color="gray">{viewingItem.repo_type === 'GITHUB' ? t('github') : (viewingItem.repo_type || t('common:na'))}</Badge>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('enable')}:
            </Text>
            <EnableBadge enable={viewingItem.enable} />
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('cron')}:
            </Text>
            <CronCell cron={viewingItem.cron} />
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('token')}:
            </Text>
            <Group gap={4}>
              <Text size="sm" style={{ fontFamily: showToken ? undefined : 'monospace' }}>
                {cfg.token ? (showToken ? cfg.token : '••••••••') : t('common:na')}
              </Text>
              {cfg.token && (
                <ActionIcon variant="subtle" size="sm" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </ActionIcon>
              )}
            </Group>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('taskType')}:
            </Text>
            <Group gap={4}>
              {Array.isArray(cfg.task_type_list)
                ? (cfg.task_type_list as string[]).map(v => (
                    <Badge key={v} size="sm" color="cyan">{t(TASK_TYPE_LABELS[v] || v)}</Badge>
                  ))
                : <Text size="sm">{t('common:na')}</Text>}
            </Group>
          </Group>
          <Divider />
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('createDatetime')}:
            </Text>
            <Text size="sm">
              {viewingItem.create_datetime
                ? formatLocalDate(viewingItem.create_datetime)
                : t('common:na')}
            </Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={100}>
              {t('updateDatetime')}:
            </Text>
            <Text size="sm">
              {viewingItem.update_datetime
                ? formatLocalDate(viewingItem.update_datetime)
                : t('common:na')}
            </Text>
          </Group>
        </Stack>
      );})()}
    </Drawer>
  );

  const renderDeleteModal = () => (
    <Modal
      opened={openedDelete}
      onClose={closeDelete}
      title={<Title order={4}>{t('confirmDelete')}</Title>}
      size="sm"
    >
      <Text>{t('confirmDeleteMessage')}</Text>
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={closeDelete}>
          {t('common:cancel')}
        </Button>
        <Button color="red" onClick={handleConfirmDelete}>
          {t('common:delete')}
        </Button>
      </Group>
    </Modal>
  );

  if (loading && items.length === 0) {
    return (
      <Stack>
        <Skeleton height={50} radius="md" />
        <Skeleton height={400} radius="md" />
      </Stack>
    );
  }

  const rows = items.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Text size="sm" style={{ maxWidth: 180 }} truncate="end">
          {item.id}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.username || t('common:na')}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.repo_name || t('common:na')}</Text>
      </Table.Td>
      <Table.Td>
        <Badge size="sm" color="gray">{item.repo_type === 'GITHUB' ? t('github') : (item.repo_type || t('common:na'))}</Badge>
      </Table.Td>
      <Table.Td>
        <EnableBadge enable={item.enable} />
      </Table.Td>
      <Table.Td>
        <CronCell cron={item.cron} />
      </Table.Td>
      <Table.Td>
        <TaskTypeCell config={item.config} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {item.create_datetime
            ? formatLocalDate(item.create_datetime)
            : t('common:na')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {item.update_datetime
            ? formatLocalDate(item.update_datetime)
            : t('common:na')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={() => handleView(item)}
          >
            {t('common:view')}
          </Button>
          <Button
            size="xs"
            variant="light"
            onClick={() => handleEdit(item)}
          >
            {t('common:edit')}
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            onClick={() => handleDelete(item)}
          >
            {t('common:delete')}
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={2}>{t('dataDownloadTitle')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group gap="md" align="flex-end">
          <TextInput
            label={t('username')}
            placeholder={t('userNamePlaceholder')}
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.currentTarget.value)}
            style={{ minWidth: 140 }}
          />
          <TextInput
            label={t('repoName')}
            placeholder={t('repoNamePlaceholder')}
            value={searchRepoName}
            onChange={(e) => setSearchRepoName(e.currentTarget.value)}
            style={{ minWidth: 140 }}
          />
          <Select
            label={t('enable')}
            placeholder={t('allStatus')}
            data={[
              { value: '', label: t('allStatus') },
              { value: 'true', label: t('enabled') },
              { value: 'false', label: t('disabled') },
            ]}
            value={searchEnable}
            onChange={(value) => setSearchEnable(value || '')}
            clearable
            style={{ minWidth: 100 }}
          />
          <Button onClick={handleSearch}>{t('common:search')}</Button>
          <Button variant="default" onClick={handleReset}>
            {t('common:reset')}
          </Button>
          <Button onClick={handleCreate}>{t('addPlan')}</Button>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 60 }}>#</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>
                  {t('username')}
                </Table.Th>
                <Table.Th style={{ minWidth: 100 }}>
                  {t('repoName')}
                </Table.Th>
                <Table.Th style={{ minWidth: 80 }}>
                  {t('repoType')}
                </Table.Th>
                <Table.Th style={{ minWidth: 60 }}>
                  {t('enable')}
                </Table.Th>
                <Table.Th style={{ minWidth: 120 }}>
                  {t('cron')}
                </Table.Th>
                <Table.Th style={{ minWidth: 160 }}>
                  {t('taskType')}
                </Table.Th>
                <Table.Th style={{ minWidth: 140 }}>
                  {t('createDatetime')}
                </Table.Th>
                <Table.Th style={{ minWidth: 140 }}>
                  {t('updateDatetime')}
                </Table.Th>
                <Table.Th style={{ minWidth: 180 }}>
                  {t('actions')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </ScrollArea>

        {total > 0 && (
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              {total}
            </Text>
            <Group>
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
                total={totalPages}
                value={page}
                onChange={setPage}
                size="sm"
              />
            </Group>
          </Group>
        )}
      </Card>

      {renderModal()}
      {renderViewDrawer()}
      {renderDeleteModal()}
    </Stack>
  );
}
