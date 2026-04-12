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
  NumberInput,
  Textarea,
  Pagination,
  Skeleton,
  Drawer,
  Divider,
  Badge,
  SegmentedControl,
  ScrollArea,
  Badge as MapBadge,
  Select,
} from '@mantine/core';
import classes from './jobs.module.css';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { jobApi, Job, CreateJobRequest, UpdateJobRequest } from '@/api/job';
import { postJson } from '@/api/http';
import { LocationMap } from '@/components/map/LocationMap';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_pathlessLayout/admin/jobs')({
  component: RouteComponent,
});

interface SearchParam {
  page: { num: number; size: number };
  name?: string;
  address?: string;
  salary?: number;
}

interface ApiPageResult<T> {
  items: T[];
  total: number;
  num: number;
  size: number;
}

function RouteComponent() {
  const { t } = useTranslation(['job', 'common']);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [openedModal, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [openedDelete, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [openedView, { open: openView, close: closeView }] =
    useDisclosure(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateJobRequest>({
    name: '',
    company_name: '',
    address: '',
    salary_min: 0,
    salary_max: 0,
    description: '',
    url: '',
    platform: '',
    location_name: '',
    degree_name: '',
    year: undefined,
    salary_total_month: 12,
    boss_name: '',
    boss_company_name: '',
    boss_position: '',
    skill_tag: '',
    welfare_tag: '',
    longitude: undefined,
    latitude: undefined,
  });

  const loadJobs = async () => {
    setLoading(true);
    try {
      const param: SearchParam = {
        page: { num: page, size: pageSize },
        name: searchName || undefined,
        address: searchAddress || undefined,
      };
      const result = await postJson<ApiPageResult<Job>>(
        '/api/job/search',
        param
      );
      setJobs(result.items);
      setTotal(result.total);
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Failed to load jobs: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadJobs();
  };

  const handlePageSizeChange = (value: string | null) => {
    if (value) {
      setPageSize(Number(value));
      setPage(1);
    }
  };

  const handleCreate = () => {
    setEditingJob(null);
    setFormData({
      name: '',
      company_name: '',
      address: '',
      salary_min: 0,
      salary_max: 0,
      description: '',
      url: '',
      platform: '',
      location_name: '',
      degree_name: '',
      year: undefined,
      salary_total_month: 12,
      boss_name: '',
      boss_company_name: '',
      boss_position: '',
      skill_tag: '',
      welfare_tag: '',
      longitude: undefined,
      latitude: undefined,
    });
    openModal();
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      name: job.name || '',
      company_name: job.company_name || '',
      address: job.address || '',
      salary_min: job.salary_min || 0,
      salary_max: job.salary_max || 0,
      description: job.description || '',
      url: job.url || '',
      platform: job.platform || '',
      location_name: job.location_name || '',
      degree_name: job.degree_name || '',
      year: job.year,
      salary_total_month: job.salary_total_month || 12,
      boss_name: job.boss_name || '',
      boss_company_name: job.boss_company_name || '',
      boss_position: job.boss_position || '',
      skill_tag: job.skill_tag || '',
      welfare_tag: job.welfare_tag || '',
      longitude: job.longitude,
      latitude: job.latitude,
    });
    openModal();
  };

  const handleDelete = (job: Job) => {
    setDeletingJob(job);
    openDelete();
  };

  const handleView = (job: Job) => {
    setViewingJob(job);
    openView();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingJob) {
        const data: UpdateJobRequest = {
          name: formData.name || undefined,
          company_name: formData.company_name || undefined,
          address: formData.address || undefined,
          salary_min: formData.salary_min || undefined,
          salary_max: formData.salary_max || undefined,
          description: formData.description || undefined,
          url: formData.url || undefined,
          platform: formData.platform || undefined,
          location_name: formData.location_name || undefined,
          degree_name: formData.degree_name || undefined,
          year: formData.year || undefined,
          salary_total_month: formData.salary_total_month || undefined,
          boss_name: formData.boss_name || undefined,
          boss_company_name: formData.boss_company_name || undefined,
          boss_position: formData.boss_position || undefined,
          skill_tag: formData.skill_tag || undefined,
          welfare_tag: formData.welfare_tag || undefined,
          longitude: formData.longitude,
          latitude: formData.latitude,
        };
        await jobApi.update(editingJob.id, data);
        showNotification({
          color: 'green',
          title: 'Success',
          message: 'Job updated successfully',
        });
      } else {
        await jobApi.create(formData);
        showNotification({
          color: 'green',
          title: 'Success',
          message: 'Job created successfully',
        });
      }
      closeModal();
      loadJobs();
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Operation failed: ${error}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    setSubmitting(true);
    try {
      await jobApi.delete(deletingJob.id);
      showNotification({
        color: 'green',
        title: 'Success',
        message: 'Job deleted successfully',
      });
      closeDelete();
      loadJobs();
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Delete failed: ${error}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Stack gap="md">
      <Title order={2}>{t('job:title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group>
          <TextInput
            placeholder={t('job:pleaseEnterJobName')}
            value={searchName}
            onChange={(e) => setSearchName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <TextInput
            placeholder={t('job:pleaseEnterLocation')}
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>{t('common:search')}</Button>
          <SegmentedControl
            value={viewMode}
            onChange={(v) => setViewMode(v as 'table' | 'map')}
            data={[
              { label: t('job:tableView'), value: 'table' },
              { label: t('job:mapView'), value: 'map' },
            ]}
          />
          <Button ml="auto" onClick={handleCreate}>
            {t('job:addJob')}
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {viewMode === 'table' ? (
          loading ? (
            <Stack>
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
            </Stack>
          ) : (
            <div className={classes.tableViewContainer}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('job:name')}</Table.Th>
                    <Table.Th>{t('job:company')}</Table.Th>
                    <Table.Th>{t('job:location')}</Table.Th>
                    <Table.Th>{t('job:degree')}</Table.Th>
                    <Table.Th>{t('job:year')}</Table.Th>
                    <Table.Th>{t('job:salary')}</Table.Th>
                    <Table.Th>{t('job:publishTime')}</Table.Th>
                    <Table.Th>{t('job:firstScanTime')}</Table.Th>
                    <Table.Th>{t('job:actions')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {jobs.map((job) => (
                    <Table.Tr key={job.id}>
                      <Table.Td>{job.name}</Table.Td>
                      <Table.Td>{job.company_name}</Table.Td>
                      <Table.Td>{job.address || job.location_name}</Table.Td>
                      <Table.Td>{job.degree_name || '-'}</Table.Td>
                      <Table.Td>
                        {job.year != null
                          ? t('job:yearValue', { year: job.year })
                          : '-'}
                      </Table.Td>
                      <Table.Td>
                        {job.salary_min && job.salary_max
                          ? `${job.salary_min / 1000}k-${
                              job.salary_max / 1000
                            }k`
                          : '-'}
                      </Table.Td>
                      <Table.Td>
                        {job.first_publish_datetime?.slice(0, 10) || '-'}
                      </Table.Td>
                      <Table.Td>
                        {job.create_datetime?.slice(0, 10) || '-'}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => handleView(job)}
                          >
                            {t('common:view')}
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => handleEdit(job)}
                          >
                            {t('common:edit')}
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            onClick={() => handleDelete(job)}
                          >
                            {t('common:delete')}
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )
        ) : (
          <div className={classes.mapViewContainer}>
            <Card
              className={classes.sidebar}
              shadow="sm"
              padding={0}
              radius="md"
              withBorder
            >
              <div className={classes.sidebarHeader}>
                <Text size="sm" fw={500}>
                  {t('job:jobList')} ({total})
                </Text>
              </div>
              <ScrollArea className={classes.sidebarContent}>
                {loading ? (
                  <Stack gap="xs" p="sm">
                    <Skeleton height={50} radius="md" />
                    <Skeleton height={50} radius="md" />
                    <Skeleton height={50} radius="md" />
                  </Stack>
                ) : jobs.length === 0 ? (
                  <div className={classes.noCoords}>{t('common:noData')}</div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`${classes.listItem} ${
                        selectedItemId === job.id ? classes.selected : ''
                      }`}
                      onClick={() => setSelectedItemId(job.id)}
                      onDoubleClick={() => handleView(job)}
                    >
                      <div className={classes.listItemTitle}>
                        {job.name || '-'}
                      </div>
                      <div className={classes.listItemSubtitle}>
                        {job.company_name || '-'}
                        {job.salary_min && job.salary_max && (
                          <MapBadge
                            size="xs"
                            variant="light"
                            color="green"
                            ml="xs"
                          >
                            {job.salary_min / 1000}k-{job.salary_max / 1000}k
                          </MapBadge>
                        )}
                      </div>
                      <div className={classes.listItemSubtitle}>
                        {job.address || job.location_name || '-'}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <div className={classes.sidebarFooter}>
                <Group justify="center" gap="sm" wrap="nowrap">
                  <Pagination
                    value={page}
                    onChange={(p) => {
                      setPage(p);
                      setSelectedItemId(null);
                    }}
                    total={totalPages}
                    size="sm"
                  />
                  <Select
                    value={String(pageSize)}
                    onChange={handlePageSizeChange}
                    data={[
                      { value: '50', label: '50/页' },
                      { value: '100', label: '100/页' },
                      { value: '200', label: '200/页' },
                      { value: '500', label: '500/页' },
                      { value: '1000', label: '1000/页' },
                    ]}
                    style={{ width: 100 }}
                    size="sm"
                  />
                </Group>
              </div>
            </Card>
            <Card
              className={classes.mapContainer}
              shadow="sm"
              padding={0}
              radius="md"
              withBorder
            >
              <LocationMap
                mode="multi"
                type="job"
                items={jobs
                  .filter(
                    (job) => job.longitude != null && job.latitude != null
                  )
                  .map((job) => ({
                    id: job.id,
                    name: job.name || '',
                    address: job.address || job.location_name,
                    longitude: job.longitude,
                    latitude: job.latitude,
                    company: job.company_name,
                    salary: {
                      min: job.salary_min,
                      max: job.salary_max,
                    },
                    degree: job.degree_name,
                    year: job.year,
                  }))}
                selectedId={selectedItemId}
                onItemClick={(id) => {
                  setSelectedItemId(id);
                  const job = jobs.find((j) => j.id === id);
                  if (job) handleView(job);
                }}
              />
            </Card>
          </div>
        )}
        {viewMode === 'table' && (
          <Group justify="center" mt="md">
            <Pagination
              value={Math.min(page, Math.max(1, totalPages))}
              onChange={setPage}
              total={Math.max(1, totalPages)}
            />
            <Select
              value={String(pageSize)}
              onChange={handlePageSizeChange}
              data={[
                { value: '50', label: '50/页' },
                { value: '100', label: '100/页' },
                { value: '200', label: '200/页' },
                { value: '500', label: '500/页' },
                { value: '1000', label: '1000/页' },
              ]}
              style={{ width: 100 }}
              size="sm"
            />
          </Group>
        )}
      </Card>

      <Modal
        opened={openedModal}
        onClose={closeModal}
        title={editingJob ? t('job:editJob') : t('job:addJob')}
        size="lg"
      >
        <Stack>
          <TextInput
            label={t('job:name')}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            required
          />
          <TextInput
            label={t('job:companyName')}
            value={formData.company_name}
            onChange={(e) =>
              setFormData({ ...formData, company_name: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('job:location')}
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.currentTarget.value })
            }
          />
          <Group grow>
            <NumberInput
              label={t('job:longitude')}
              value={formData.longitude ?? ''}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  longitude: val !== '' ? Number(val) : undefined,
                })
              }
              decimalScale={6}
            />
            <NumberInput
              label={t('job:latitude')}
              value={formData.latitude ?? ''}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  latitude: val !== '' ? Number(val) : undefined,
                })
              }
              decimalScale={6}
            />
          </Group>
          <TextInput
            label={t('job:jobDescription')}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('job:jobUrl')}
            value={formData.url}
            onChange={(e) =>
              setFormData({ ...formData, url: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('job:platform')}
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.currentTarget.value })
            }
          />
          <Textarea
            label={t('job:skillTag')}
            value={formData.skill_tag}
            onChange={(e) =>
              setFormData({ ...formData, skill_tag: e.currentTarget.value })
            }
            placeholder={t('job:skillTagPlaceholder')}
          />
          <Textarea
            label={t('job:welfareTag')}
            value={formData.welfare_tag}
            onChange={(e) =>
              setFormData({ ...formData, welfare_tag: e.currentTarget.value })
            }
            placeholder={t('job:welfareTagPlaceholder')}
          />
          <Button onClick={handleSubmit} loading={submitting}>
            {editingJob ? t('common:update') : t('common:create')}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={openedDelete}
        onClose={closeDelete}
        title={t('job:confirmDelete')}
      >
        <Text>
          {t('job:confirmDeleteMessage', { name: deletingJob?.name || '' })}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDelete}>
            {t('common:cancel')}
          </Button>
          <Button
            color="red"
            onClick={handleConfirmDelete}
            loading={submitting}
          >
            {t('common:delete')}
          </Button>
        </Group>
      </Modal>

      <Drawer
        opened={openedView}
        onClose={closeView}
        title={t('job:jobDetails')}
        size="md"
        position="right"
      >
        {viewingJob && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                职位名称
              </Text>
              <Text size="lg" fw={500}>
                {viewingJob.name || '-'}
              </Text>
            </div>
            <Divider />
            <div>
              <Text size="sm" c="dimmed">
                公司名称
              </Text>
              <Text size="md">{viewingJob.company_name || '-'}</Text>
            </div>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  工作地点
                </Text>
                <Text size="md">
                  {viewingJob.address || viewingJob.location_name || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  平台
                </Text>
                <Text size="md">{viewingJob.platform || '-'}</Text>
              </div>
            </Group>
            {viewingJob.longitude && viewingJob.latitude ? (
              <>
                <Group grow>
                  <div>
                    <Text size="sm" c="dimmed">
                      经度
                    </Text>
                    <Text size="md">{viewingJob.longitude}</Text>
                  </div>
                  <div>
                    <Text size="sm" c="dimmed">
                      纬度
                    </Text>
                    <Text size="md">{viewingJob.latitude}</Text>
                  </div>
                </Group>
                <LocationMap
                  mode="single"
                  longitude={viewingJob.longitude}
                  latitude={viewingJob.latitude}
                  name={viewingJob.name}
                  address={viewingJob.address || viewingJob.location_name}
                  height={250}
                />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                暂无坐标信息
              </Text>
            )}
            <Divider label="薪资信息" labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  最低薪资
                </Text>
                <Text size="md">
                  {viewingJob.salary_min ? `${viewingJob.salary_min}元` : '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  最高薪资
                </Text>
                <Text size="md">
                  {viewingJob.salary_max ? `${viewingJob.salary_max}元` : '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  薪资月数
                </Text>
                <Text size="md">
                  {viewingJob.salary_total_month
                    ? `${viewingJob.salary_total_month}个月`
                    : '-'}
                </Text>
              </div>
            </Group>
            <Divider label="职位描述" labelPosition="left" />
            <Text size="md" style={{ whiteSpace: 'pre-wrap' }}>
              {viewingJob.description || '-'}
            </Text>
            <Divider label="标签信息" labelPosition="left" />
            <div>
              <Text size="sm" c="dimmed">
                技能标签
              </Text>
              <Group mt="xs">
                {viewingJob.skill_tag ? (
                  viewingJob.skill_tag
                    .split(',')
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <Badge key={idx} variant="light" color="blue">
                        {tag.trim()}
                      </Badge>
                    ))
                ) : (
                  <Text size="md">-</Text>
                )}
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                福利标签
              </Text>
              <Group mt="xs">
                {viewingJob.welfare_tag ? (
                  viewingJob.welfare_tag
                    .split(',')
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <Badge key={idx} variant="light" color="green">
                        {tag.trim()}
                      </Badge>
                    ))
                ) : (
                  <Text size="md">-</Text>
                )}
              </Group>
            </div>
            <Divider label="Boss 信息" labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  Boss 名称
                </Text>
                <Text size="md">{viewingJob.boss_name || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Boss 职位
                </Text>
                <Text size="md">{viewingJob.boss_position || '-'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                Boss 公司
              </Text>
              <Text size="md">{viewingJob.boss_company_name || '-'}</Text>
            </div>
            <Divider label="其他信息" labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  学历要求
                </Text>
                <Text size="md">{viewingJob.degree_name || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  工作年限
                </Text>
                <Text size="md">
                  {viewingJob.year ? `${viewingJob.year}年` : '-'}
                </Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                职位链接
              </Text>
              {viewingJob.url ? (
                <Text size="md" c="blue" style={{ wordBreak: 'break-all' }}>
                  <a
                    href={viewingJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {viewingJob.url}
                  </a>
                </Text>
              ) : (
                <Text size="md">-</Text>
              )}
            </div>
            <Divider label="时间信息" labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  发布时间
                </Text>
                <Text size="md">
                  {viewingJob.first_publish_datetime
                    ?.slice(0, 19)
                    .replace('T', ' ') || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  创建时间
                </Text>
                <Text size="md">
                  {viewingJob.create_datetime?.slice(0, 19).replace('T', ' ') ||
                    '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  更新时间
                </Text>
                <Text size="md">
                  {viewingJob.update_datetime?.slice(0, 19).replace('T', ' ') ||
                    '-'}
                </Text>
              </div>
            </Group>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
