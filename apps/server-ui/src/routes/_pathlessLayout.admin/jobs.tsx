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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { jobApi, Job, CreateJobRequest, UpdateJobRequest } from '@/api/job';
import { postJson } from '@/api/http';

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
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
      <Title order={2}>职位数据</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group>
          <TextInput
            placeholder="职位名称"
            value={searchName}
            onChange={(e) => setSearchName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <TextInput
            placeholder="工作地点"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>搜索</Button>
          <Button ml="auto" onClick={handleCreate}>
            新增职位
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {loading ? (
          <Stack>
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
          </Stack>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>职位名称</Table.Th>
                <Table.Th>公司</Table.Th>
                <Table.Th>地点</Table.Th>
                <Table.Th>薪资</Table.Th>
                <Table.Th>发布时间</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {jobs.map((job) => (
                <Table.Tr key={job.id}>
                  <Table.Td>{job.name}</Table.Td>
                  <Table.Td>{job.company_name}</Table.Td>
                  <Table.Td>{job.address || job.location_name}</Table.Td>
                  <Table.Td>
                    {job.salary_min && job.salary_max
                      ? `${job.salary_min / 1000}k-${job.salary_max / 1000}k`
                      : '-'}
                  </Table.Td>
                  <Table.Td>
                    {job.first_publish_datetime?.slice(0, 10) || '-'}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleView(job)}
                      >
                        查看
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleEdit(job)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(job)}
                      >
                        删除
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} />
          </Group>
        )}
      </Card>

      <Modal
        opened={openedModal}
        onClose={closeModal}
        title={editingJob ? '编辑职位' : '新增职位'}
        size="lg"
      >
        <Stack>
          <TextInput
            label="职位名称"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            required
          />
          <TextInput
            label="公司名称"
            value={formData.company_name}
            onChange={(e) =>
              setFormData({ ...formData, company_name: e.currentTarget.value })
            }
          />
          <TextInput
            label="工作地点"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.currentTarget.value })
            }
          />
          <Group grow>
            <NumberInput
              label="最低薪资"
              value={formData.salary_min}
              onChange={(val) =>
                setFormData({ ...formData, salary_min: Number(val) })
              }
              min={0}
            />
            <NumberInput
              label="最高薪资"
              value={formData.salary_max}
              onChange={(val) =>
                setFormData({ ...formData, salary_max: Number(val) })
              }
              min={0}
            />
          </Group>
          <TextInput
            label="职位描述"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.currentTarget.value })
            }
          />
          <TextInput
            label="职位URL"
            value={formData.url}
            onChange={(e) =>
              setFormData({ ...formData, url: e.currentTarget.value })
            }
          />
          <TextInput
            label="平台"
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.currentTarget.value })
            }
          />
          <Textarea
            label="技能标签"
            value={formData.skill_tag}
            onChange={(e) =>
              setFormData({ ...formData, skill_tag: e.currentTarget.value })
            }
            placeholder="用逗号分隔多个标签"
          />
          <Textarea
            label="福利标签"
            value={formData.welfare_tag}
            onChange={(e) =>
              setFormData({ ...formData, welfare_tag: e.currentTarget.value })
            }
            placeholder="用逗号分隔多个标签"
          />
          <Button onClick={handleSubmit} loading={submitting}>
            {editingJob ? '更新' : '创建'}
          </Button>
        </Stack>
      </Modal>

      <Modal opened={openedDelete} onClose={closeDelete} title="确认删除">
        <Text>确定要删除职位 "{deletingJob?.name}" 吗？此操作不可恢复。</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDelete}>
            取消
          </Button>
          <Button
            color="red"
            onClick={handleConfirmDelete}
            loading={submitting}
          >
            删除
          </Button>
        </Group>
      </Modal>

      <Drawer
        opened={openedView}
        onClose={closeView}
        title="职位详情"
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
