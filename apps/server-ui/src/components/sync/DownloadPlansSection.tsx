import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Drawer,
  Group,
  Modal,
  Pagination,
  PasswordInput,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
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

const TASK_TYPE_LABELS: Record<string, string> = {
  JOB_DATA_DOWNLOAD: 'taskTypeJobDataDownload',
  COMPANY_DATA_DOWNLOAD: 'taskTypeCompanyDataDownload',
  JobDataDownload: 'taskTypeJobDataDownload',
  CompanyDataDownload: 'taskTypeCompanyDataDownload',
};

const TASK_TYPE_TO_FORM: Record<string, string> = {
  JobDataDownload: 'JOB_DATA_DOWNLOAD',
  CompanyDataDownload: 'COMPANY_DATA_DOWNLOAD',
};

const getCronPresets = (t: (key: string) => string) => [
  { label: t('cronEvery30s'), value: '*/30 * * * * *' },
  { label: t('cronEveryMin'), value: '0 * * * * *' },
  { label: t('cronEvery5Min'), value: '0 */5 * * * *' },
  { label: t('cronEvery30Min'), value: '0 */30 * * * *' },
  { label: t('cronEveryHour'), value: '0 0 * * * *' },
  { label: t('cronEvery6Hour'), value: '0 */6 * * * *' },
  { label: t('cronDaily'), value: '0 0 0 * * *' },
  { label: t('cronWeekly'), value: '0 0 0 * * 0' },
  { label: t('cronMonthly'), value: '0 0 0 1 * *' },
];

const PRESET_VALUES = [
  '*/30 * * * * *', '0 * * * * *', '0 */5 * * * *', '0 */30 * * * *',
  '0 0 * * * *', '0 */6 * * * *', '0 0 0 * * *', '0 0 0 * * 0', '0 0 0 1 * *',
];

function parsePlanConfig(config?: string | null): Record<string, unknown> {
  try {
    return config ? JSON.parse(config) : {};
  } catch {
    return {};
  }
}

function EnableBadge({ enable }: { enable?: boolean }) {
  const { t } = useTranslation(['sync']);
  return (
    <Badge
      color={enable ? 'green' : 'gray'}
      leftSection={
        <div className={enable ? 'i-mdi:check-circle-outline' : 'i-mdi:close-circle-outline'} />
      }
    >
      {enable ? t('enabled') : t('disabled')}
    </Badge>
  );
}

function TaskTypeCell({ config }: { config?: string | null }) {
  const { t } = useTranslation(['sync']);
  const cfg = parsePlanConfig(config);
  const list = Array.isArray(cfg.task_type_list)
    ? (cfg.task_type_list as string[])
    : [];
  if (list.length === 0) return <Text size="sm">-</Text>;
  return (
    <Group gap={4}>
      {list.map((v) => (
        <Badge key={v} size="sm" color="cyan">
          {t((TASK_TYPE_LABELS[v] || v) as any)}
        </Badge>
      ))}
    </Group>
  );
}

function CronCell({ cron }: { cron?: string | null }) {
  const { t } = useTranslation(['sync']);
  const times = cron ? getNextCronTimes(cron, 5) : null;
  const inner = <Text size="sm">{cron || '-'}</Text>;
  if (!times) return inner;
  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs" fw={500}>
            {t('nextRun')}:
          </Text>
          {times.map((d, i) => (
            <Text key={i} size="xs">
              {formatCronTime(d)}
            </Text>
          ))}
        </Stack>
      }
      withArrow
    >
      {inner}
    </Tooltip>
  );
}

export default function DownloadPlansSection() {
  const { t } = useTranslation(['sync', 'common']);

  const [items, setItems] = useState<TaskDataPlanDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [searchUserName, setSearchUserName] = useState('');
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

  const [form, setForm] = useState({
    enable: true,
    cron: '',
    cronIsCustom: false,
    user_name: '',
    repo_name: '',
    repo_type: 'GITHUB',
    token: '',
    task_type_list: [] as string[],
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const param = {
        page: { num: page, size: pageSize },
        user_name: searchUserName || undefined,
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
    setSearchUserName('');
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
    setForm({
      enable: true,
      cron: '',
      cronIsCustom: false,
      user_name: '',
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
    setForm({
      enable: item.enable ?? true,
      cron: cronVal,
      cronIsCustom: cronVal !== '' && !PRESET_VALUES.includes(cronVal),
      user_name: item.user_name ?? '',
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
    if (!form.cron) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateCronRequired') });
      return;
    }
    if (form.task_type_list.length === 0) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateTaskTypeRequired') });
      return;
    }
    if (!form.user_name) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateUserNameRequired') });
      return;
    }
    if (!form.repo_name) {
      showNotification({ color: 'red', title: t('common:error'), message: t('validateRepoNameRequired') });
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        const data: UpdateTaskDataPlanRequest = {
          enable: form.enable,
          cron: form.cron || undefined,
          user_name: form.user_name || undefined,
          repo_name: form.repo_name || undefined,
          repo_type: form.repo_type || undefined,
          token: form.token || undefined,
          task_type_list: form.task_type_list.length > 0 ? form.task_type_list : undefined,
        };
        await taskDataPlanApi.update(editingItem.id, data);
        showNotification({ color: 'green', title: t('common:success'), message: t('updateSuccess') });
      } else {
        const data: CreateTaskDataPlanRequest = {
          enable: form.enable,
          cron: form.cron || undefined,
          user_name: form.user_name || undefined,
          repo_name: form.repo_name || undefined,
          repo_type: form.repo_type || undefined,
          token: form.token || undefined,
          task_type_list: form.task_type_list.length > 0 ? form.task_type_list : undefined,
        };
        await taskDataPlanApi.create(data);
        showNotification({ color: 'green', title: t('common:success'), message: t('createSuccess') });
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
      showNotification({ color: 'green', title: t('common:success'), message: t('deleteSuccess') });
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
      title={<Title order={4}>{editingItem ? t('editPlan') : t('addPlan')}</Title>}
      size="lg"
    >
      <Stack gap="md">
        <Group>
          <Text>{t('enable')}</Text>
          <Switch
            checked={form.enable}
            onChange={(e) => setForm({ ...form, enable: e.currentTarget.checked })}
          />
        </Group>
        <Select
          label={t('cron')}
          placeholder={t('cron')}
          data={[...getCronPresets(t as unknown as (key: string) => string), { label: t('cronCustom'), value: '__custom__' }]}
          value={form.cronIsCustom ? '__custom__' : form.cron || null}
          onChange={(value) => {
            if (value === '__custom__') {
              setForm({ ...form, cronIsCustom: true, cron: '' });
            } else if (value) {
              setForm({ ...form, cronIsCustom: false, cron: value });
            }
          }}
          required
        />
        {form.cronIsCustom && (
          <TextInput
            label={t('cron')}
            placeholder={t('cron')}
            value={form.cron}
            onChange={(e) => setForm({ ...form, cron: e.currentTarget.value })}
          />
        )}
        <Select
          label={t('repoType')}
          data={[{ value: 'GITHUB', label: t('github') }]}
          value={form.repo_type}
          onChange={(value) => setForm({ ...form, repo_type: value || 'GITHUB' })}
          required
        />
        <TextInput
          label={t('userName')}
          placeholder={t('userNamePlaceholder')}
          value={form.user_name}
          onChange={(e) => setForm({ ...form, user_name: e.currentTarget.value })}
          required
        />
        <TextInput
          label={t('repoName')}
          placeholder={t('repoNamePlaceholder')}
          value={form.repo_name}
          onChange={(e) => setForm({ ...form, repo_name: e.currentTarget.value })}
          required
        />
        <PasswordInput
          label={t('token')}
          value={form.token}
          onChange={(e) => setForm({ ...form, token: e.currentTarget.value })}
        />
        <Checkbox.Group
          label={t('taskType')}
          value={form.task_type_list}
          onChange={(value) => setForm({ ...form, task_type_list: value })}
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
      title={<Title order={4}>{t('planDetails')}</Title>}
      size="lg"
      position="right"
    >
      {viewingItem &&
        (() => {
          const cfg = parsePlanConfig(viewingItem.config);
          return (
            <Stack gap="md">
              <Group>
                <Text size="sm" c="dimmed" w={100}>ID:</Text>
                <Text size="sm">{viewingItem.id}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('userName')}:</Text>
                <Text size="sm">{viewingItem.user_name || t('common:na')}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('repoName')}:</Text>
                <Text size="sm">{viewingItem.repo_name || t('common:na')}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('repoType')}:</Text>
                <Badge size="sm" color="gray" leftSection={<div className="i-mdi:github" />}>
                  {viewingItem.repo_type === 'GITHUB' ? t('github') : viewingItem.repo_type || t('common:na')}
                </Badge>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('enable')}:</Text>
                <EnableBadge enable={viewingItem.enable} />
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('cron')}:</Text>
                <CronCell cron={viewingItem.cron} />
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('token')}:</Text>
                <Group gap={4}>
                  <Text size="sm" style={{ fontFamily: showToken ? undefined : 'monospace' }}>
                    {(cfg.token ? (showToken ? cfg.token : '••••••••') : t('common:na')) as string}
                  </Text>
                  {cfg.token ? (
                    <ActionIcon variant="subtle" size="sm" onClick={() => setShowToken(!showToken)}>
                      {showToken ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </ActionIcon>
                  ) : null}
                </Group>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('taskType')}:</Text>
                <TaskTypeCell config={viewingItem.config} />
              </Group>
              <Divider />
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('createDatetime')}:</Text>
                <Text size="sm">
                  {viewingItem.create_datetime ? formatLocalDate(viewingItem.create_datetime) : t('common:na')}
                </Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={100}>{t('updateDatetime')}:</Text>
                <Text size="sm">
                  {viewingItem.update_datetime ? formatLocalDate(viewingItem.update_datetime) : t('common:na')}
                </Text>
              </Group>
            </Stack>
          );
        })()}
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
        <Button variant="default" onClick={closeDelete}>{t('common:cancel')}</Button>
        <Button color="red" onClick={handleConfirmDelete}>{t('common:delete')}</Button>
      </Group>
    </Modal>
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Title order={4} mb="md">{t('downloadPlans')}</Title>

      <Group gap="md" align="flex-end" mb="md">
        <TextInput
          label={t('userName')}
          placeholder={t('userNamePlaceholder')}
          value={searchUserName}
          onChange={(e) => setSearchUserName(e.currentTarget.value)}
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
        <Button onClick={handleSearch}>{t('search')}</Button>
        <Button variant="default" onClick={handleReset}>{t('reset')}</Button>
        <Button onClick={handleCreate}>{t('addPlan')}</Button>
      </Group>

      {loading && items.length === 0 ? (
        <Skeleton height={300} radius="md" />
      ) : items.length === 0 ? (
        <Text c="dimmed" py="xl" ta="center">{t('noPlans')}</Text>
      ) : (
        <>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 60 }}>#</Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>{t('userName')}</Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>{t('repoName')}</Table.Th>
                  <Table.Th style={{ minWidth: 80 }}>{t('repoType')}</Table.Th>
                  <Table.Th style={{ minWidth: 60 }}>{t('enable')}</Table.Th>
                  <Table.Th style={{ minWidth: 120 }}>{t('cron')}</Table.Th>
                  <Table.Th style={{ minWidth: 160 }}>{t('taskType')}</Table.Th>
                  <Table.Th style={{ minWidth: 140 }}>{t('createDatetime')}</Table.Th>
                  <Table.Th style={{ minWidth: 140 }}>{t('updateDatetime')}</Table.Th>
                  <Table.Th style={{ minWidth: 180 }}>{t('actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item, index) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text size="sm">{(page - 1) * pageSize + index + 1}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.user_name || t('common:na')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.repo_name || t('common:na')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color="gray" leftSection={<div className="i-mdi:github" />}>
                        {item.repo_type === 'GITHUB' ? t('github') : item.repo_type || t('common:na')}
                      </Badge>
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
                        {item.create_datetime ? formatLocalDate(item.create_datetime) : t('common:na')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {item.update_datetime ? formatLocalDate(item.update_datetime) : t('common:na')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="light" onClick={() => handleView(item)}>{t('view')}</Button>
                        <Button size="xs" variant="light" onClick={() => handleEdit(item)}>{t('edit')}</Button>
                        <Button size="xs" color="red" variant="light" onClick={() => handleDelete(item)}>{t('delete')}</Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {total > 0 && (
            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">{total}</Text>
              <Group>
                <Select
                  value={String(pageSize)}
                  onChange={handlePageSizeChange}
                  data={['50', '100', '200'].map((v) => ({ value: v, label: `${v} ${t('perPage')}` }))}
                  size="sm"
                  style={{ width: 130 }}
                />
                <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
              </Group>
            </Group>
          )}
        </>
      )}

      {renderModal()}
      {renderViewDrawer()}
      {renderDeleteModal()}
    </Card>
  );
}
