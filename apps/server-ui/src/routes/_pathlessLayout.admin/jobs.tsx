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
  ActionIcon,
  UnstyledButton,
  Input,
} from '@mantine/core';
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from '@tabler/icons-react';
import classes from './jobs.module.css';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { jobApi, Job, CreateJobRequest, UpdateJobRequest } from '@/api/job';
import { postJson } from '@/api/http';
import { handleApiError } from '@/api/error';
import { LocationMap } from '@/components/map/LocationMap';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

function formatLocalDate(utcString: string | undefined): string {
  if (!utcString) return '-';
  return dayjs(utcString).format('YYYY-MM-DD HH:mm:ss');
}

export const Route = createFileRoute('/_pathlessLayout/admin/jobs')({
  component: RouteComponent,
});

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

interface SearchParam {
  page: { num: number; size: number };
  name?: string;
  company_name?: string;
  platform?: string;
  address?: string;
  salary?: number;
  order_by?: string;
  order_dir?: string;
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
  const [searchCompanyName, setSearchCompanyName] = useState('');
  const [searchSalary, setSearchSalary] = useState<number | string>('');
  const [searchPlatform, setSearchPlatform] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [orderBy, setOrderBy] = useState('first_scan_datetime');
  const [orderDir, setOrderDir] = useState('desc');
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
      const salaryValue =
        typeof searchSalary === 'number'
          ? searchSalary
          : searchSalary
            ? Number(searchSalary)
            : undefined;
      const param: SearchParam = {
        page: { num: page, size: pageSize },
        name: searchName || undefined,
        company_name: searchCompanyName || undefined,
        platform: searchPlatform || undefined,
        address: searchAddress || undefined,
        salary: salaryValue,
        order_by: orderBy,
        order_dir: orderDir,
      };
      const result = await postJson<ApiPageResult<Job>>(
        '/api/job/search',
        param,
      );
      setJobs(result.items);
      setTotal(result.total);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, pageSize, orderBy, orderDir]);

  const handleSearch = () => {
    setPage(1);
    loadJobs();
  };

  const handleReset = () => {
    setSearchName('');
    setSearchCompanyName('');
    setSearchPlatform('');
    setSearchSalary('');
    setSearchAddress('');
    setPage(1);
    loadJobs();
  };

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setOrderDir(orderDir === 'desc' ? 'asc' : 'desc');
    } else {
      setOrderBy(field);
      setOrderDir('desc');
    }
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
          title: t('common:success'),
          message: t('job:updateSuccess'),
        });
      } else {
        await jobApi.create(formData);
        showNotification({
          color: 'green',
          title: t('common:success'),
          message: t('job:createSuccess'),
        });
      }
      closeModal();
      loadJobs();
    } catch (error) {
      handleApiError(error);
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
        title: t('common:success'),
        message: t('job:deleteSuccess'),
      });
      closeDelete();
      loadJobs();
    } catch (error) {
      handleApiError(error);
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
            w={150}
            rightSection={
              searchName ? (
                <Input.ClearButton onClick={() => setSearchName('')} />
              ) : null
            }
            rightSectionPointerEvents="auto"
          />
          <TextInput
            placeholder={t('job:pleaseEnterCompanyName')}
            value={searchCompanyName}
            onChange={(e) => setSearchCompanyName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={150}
            rightSection={
              searchCompanyName ? (
                <Input.ClearButton onClick={() => setSearchCompanyName('')} />
              ) : null
            }
            rightSectionPointerEvents="auto"
          />
          <TextInput
            placeholder={t('job:pleaseEnterPlatform')}
            value={searchPlatform}
            onChange={(e) => setSearchPlatform(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={120}
            rightSection={
              searchPlatform ? (
                <Input.ClearButton onClick={() => setSearchPlatform('')} />
              ) : null
            }
            rightSectionPointerEvents="auto"
          />
          <NumberInput
            placeholder={t('job:pleaseEnterMinSalary')}
            value={searchSalary}
            onChange={(v) => setSearchSalary(v)}
            min={0}
            step={1000}
            w={120}
          />
          <TextInput
            placeholder={t('job:pleaseEnterLocation')}
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={120}
            rightSection={
              searchAddress ? (
                <Input.ClearButton onClick={() => setSearchAddress('')} />
              ) : null
            }
            rightSectionPointerEvents="auto"
          />
          <Button onClick={handleSearch}>{t('common:search')}</Button>
          <Button variant="default" onClick={handleReset}>
            {t('common:reset')}
          </Button>
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
                    <Table.Th style={{ minWidth: 50 }}>
                      {t('job:serialNumber')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 150 }}>
                      {t('job:name')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 120 }}>
                      {t('job:company')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>
                      {t('job:platform')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 120 }}>
                      {t('job:location')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>
                      {t('job:degree')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>
                      {t('job:year')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>
                      {t('job:salary')}
                    </Table.Th>
                    <SortableTh
                      field="first_publish_datetime"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('job:publishTime')}
                    </SortableTh>
                    <SortableTh
                      field="first_scan_datetime"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={130}
                    >
                      {t('job:firstScanTime')}
                    </SortableTh>
                    <SortableTh
                      field="update_datetime"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('job:updateTime')}
                    </SortableTh>
                    <Table.Th style={{ minWidth: 180 }}>
                      {t('job:actions')}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {jobs.map((job, index) => (
                    <Table.Tr
                      key={job.id}
                      onClick={() => handleView(job)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Table.Td>{(page - 1) * pageSize + index + 1}</Table.Td>
                      <Table.Td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            maxWidth: '180px',
                          }}
                        >
                          <Text
                            size="sm"
                            title={job.name}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {job.name || '-'}
                          </Text>
                          {job.name && (
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              style={{ flexShrink: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(job.name!);
                                showNotification({
                                  color: 'green',
                                  message: t('job:copiedToClipboard', {
                                    message: t('job:copiedToClipboard'),
                                  }),
                                });
                              }}
                            >
                              <div className="i-mdi:content-copy" />
                            </ActionIcon>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            maxWidth: '180px',
                          }}
                        >
                          <Text
                            size="sm"
                            title={job.company_name}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {job.company_name || '-'}
                          </Text>
                          {job.company_name && (
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              style={{ flexShrink: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(
                                  job.company_name!,
                                );
                                showNotification({
                                  color: 'green',
                                  message: t('job:copiedToClipboard', {
                                    message: t('job:copiedToClipboard'),
                                  }),
                                });
                              }}
                            >
                              <div className="i-mdi:content-copy" />
                            </ActionIcon>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>{job.platform || '-'}</Table.Td>
                      <Table.Td>
                        {job.address || job.location_name || '-'}
                        {(job.address || job.location_name) && (
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            style={{
                              display: 'inline',
                              verticalAlign: 'middle',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(
                                job.address || job.location_name || '',
                              );
                              showNotification({
                                color: 'green',
                                message: t('job:copiedToClipboard', {
                                  message: t('job:copiedToClipboard'),
                                }),
                              });
                            }}
                          >
                            <div className="i-mdi:content-copy" />
                          </ActionIcon>
                        )}
                      </Table.Td>
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
                        {formatLocalDate(job.first_publish_datetime)?.slice(
                          0,
                          10,
                        ) || '-'}
                      </Table.Td>
                      <Table.Td>
                        {formatLocalDate(job.first_scan_datetime)?.slice(
                          0,
                          10,
                        ) || '-'}
                      </Table.Td>
                      <Table.Td>
                        {formatLocalDate(job.update_datetime)?.slice(0, 10) ||
                          '-'}
                      </Table.Td>
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(job);
                            }}
                          >
                            {t('common:view')}
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(job);
                            }}
                          >
                            {t('common:edit')}
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(job);
                            }}
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
                      { value: '50', label: `50 ${t('job:perPage')}` },
                      { value: '100', label: `100 ${t('job:perPage')}` },
                      { value: '200', label: `200 ${t('job:perPage')}` },
                      { value: '500', label: `500 ${t('job:perPage')}` },
                      { value: '1000', label: `1000 ${t('job:perPage')}` },
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
                    (job) => job.longitude != null && job.latitude != null,
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
                { value: '50', label: `50 ${t('job:perPage')}` },
                { value: '100', label: `100 ${t('job:perPage')}` },
                { value: '200', label: `200 ${t('job:perPage')}` },
                { value: '500', label: `500 ${t('job:perPage')}` },
                { value: '1000', label: `1000 ${t('job:perPage')}` },
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
          <TextInput
            label={t('job:location')}
            value={formData.location_name}
            onChange={(e) =>
              setFormData({ ...formData, location_name: e.currentTarget.value })
            }
          />
          <Group grow>
            <NumberInput
              label={t('job:salaryMin')}
              value={formData.salary_min}
              onChange={(val) =>
                setFormData({ ...formData, salary_min: Number(val) || 0 })
              }
              min={0}
              step={1000}
            />
            <NumberInput
              label={t('job:salaryMax')}
              value={formData.salary_max}
              onChange={(val) =>
                setFormData({ ...formData, salary_max: Number(val) || 0 })
              }
              min={0}
              step={1000}
            />
          </Group>
          <Group grow>
            <TextInput
              label={t('job:degree')}
              value={formData.degree_name}
              onChange={(e) =>
                setFormData({ ...formData, degree_name: e.currentTarget.value })
              }
            />
            <NumberInput
              label={t('job:year')}
              value={formData.year ?? ''}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  year: val !== '' ? Number(val) : undefined,
                })
              }
              min={0}
            />
          </Group>
          <Group grow>
            <TextInput
              label={t('job:bossName')}
              value={formData.boss_name}
              onChange={(e) =>
                setFormData({ ...formData, boss_name: e.currentTarget.value })
              }
            />
            <TextInput
              label={t('job:bossPosition')}
              value={formData.boss_position}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  boss_position: e.currentTarget.value,
                })
              }
            />
          </Group>
          <TextInput
            label={t('job:bossCompany')}
            value={formData.boss_company_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                boss_company_name: e.currentTarget.value,
              })
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
                {t('job:jobNo')}
              </Text>
              <Group gap={4}>
                <Text size="md" fw={500}>
                  {viewingJob.id || '-'}
                </Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    navigator.clipboard.writeText(viewingJob.id);
                    showNotification({
                      color: 'green',
                      message: t('job:copiedToClipboard', {
                        message: t('job:copiedToClipboard'),
                      }),
                    });
                  }}
                >
                  <div className="i-mdi:content-copy" />
                </ActionIcon>
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('job:name')}
              </Text>
              <Text size="lg" fw={500}>
                {viewingJob.name || '-'}
              </Text>
            </div>
            <Divider />
            <div>
              <Text size="sm" c="dimmed">
                {t('job:companyName')}
              </Text>
              <Text size="md">{viewingJob.company_name || '-'}</Text>
            </div>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:location')}
                </Text>
                <Text size="md">{viewingJob.address || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:locationName')}
                </Text>
                <Text size="md">{viewingJob.location_name || '-'}</Text>
              </div>
            </Group>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:platform')}
                </Text>
                <Text size="md">{viewingJob.platform || '-'}</Text>
              </div>
            </Group>
            {viewingJob.longitude && viewingJob.latitude ? (
              <>
                <Group grow>
                  <div>
                    <Text size="sm" c="dimmed">
                      {t('job:longitude')}
                    </Text>
                    <Text size="md">{viewingJob.longitude}</Text>
                  </div>
                  <div>
                    <Text size="sm" c="dimmed">
                      {t('job:latitude')}
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
                {t('job:noCoords')}
              </Text>
            )}
            <Divider label={t('job:salaryInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:salaryMin')}
                </Text>
                <Text size="md">
                  {viewingJob.salary_min
                    ? `${viewingJob.salary_min}${t('job:salaryUnit')}`
                    : '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:salaryMax')}
                </Text>
                <Text size="md">
                  {viewingJob.salary_max
                    ? `${viewingJob.salary_max}${t('job:salaryUnit')}`
                    : '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:salaryTotalMonth')}
                </Text>
                <Text size="md">
                  {viewingJob.salary_total_month
                    ? `${viewingJob.salary_total_month}${t(
                        'job:salaryMonthUnit',
                      )}`
                    : '-'}
                </Text>
              </div>
            </Group>
            <Divider label={t('job:description')} labelPosition="left" />
            <Text size="md" style={{ whiteSpace: 'pre-wrap' }}>
              {viewingJob.description || '-'}
            </Text>
            <Divider label={t('job:tagInfo')} labelPosition="left" />
            <div>
              <Text size="sm" c="dimmed">
                {t('job:skillTag')}
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
                {t('job:welfareTag')}
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
            <Divider label={t('job:bossInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:bossName')}
                </Text>
                <Text size="md">{viewingJob.boss_name || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:bossPosition')}
                </Text>
                <Text size="md">{viewingJob.boss_position || '-'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                {t('job:bossCompany')}
              </Text>
              <Text size="md">{viewingJob.boss_company_name || '-'}</Text>
            </div>
            <Divider label={t('job:otherInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:degree')}
                </Text>
                <Text size="md">{viewingJob.degree_name || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:year')}
                </Text>
                <Text size="md">
                  {viewingJob.year
                    ? `${viewingJob.year}${t('job:yearUnit')}`
                    : '-'}
                </Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                {t('job:jobUrl')}
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
            <Divider label={t('job:timeInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:publishTime')}
                </Text>
                <Text size="md">
                  {formatLocalDate(viewingJob.first_publish_datetime) || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:firstScanTime')}
                </Text>
                <Text size="md">
                  {formatLocalDate(viewingJob.first_scan_datetime) || '-'}
                </Text>
              </div>
            </Group>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:createTime')}
                </Text>
                <Text size="md">
                  {formatLocalDate(viewingJob.create_datetime) || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('job:updateTime')}
                </Text>
                <Text size="md">
                  {formatLocalDate(viewingJob.update_datetime) || '-'}
                </Text>
              </div>
            </Group>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
