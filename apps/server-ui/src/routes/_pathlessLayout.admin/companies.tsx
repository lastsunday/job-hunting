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
  SegmentedControl,
  ScrollArea,
  Badge,
  Select,
} from '@mantine/core';
import classes from './companies.module.css';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import {
  companyApi,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '@/api/company';
import { postJson } from '@/api/http';
import { LocationMap } from '@/components/map/LocationMap';

export const Route = createFileRoute('/_pathlessLayout/admin/companies')({
  component: RouteComponent,
});

interface SearchParam {
  page: { num: number; size: number };
  name?: string;
  industry?: string;
}

interface ApiPageResult<T> {
  items: T[];
  total: number;
  num: number;
  size: number;
}

function RouteComponent() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchIndustry, setSearchIndustry] = useState('');
  const [openedModal, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [openedDelete, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [openedView, { open: openView, close: closeView }] =
    useDisclosure(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCompanyRequest>({
    name: '',
    platform: '',
    description: '',
    status: '',
    legal_person: '',
    unified_code: '',
    website: '',
    insurance_num: 0,
    self_risk: 0,
    union_risk: 0,
    address: '',
    scope: '',
    tax_no: '',
    industry: '',
    license_number: '',
    reg_capital_value: 0,
    reg_capital_currency: '',
    source_url: '',
    longitude: undefined,
    latitude: undefined,
  });

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const param: SearchParam = {
        page: { num: page, size: pageSize },
        name: searchName || undefined,
        industry: searchIndustry || undefined,
      };
      const result = await postJson<ApiPageResult<Company>>(
        '/api/company/search',
        param
      );
      setCompanies(result.items);
      setTotal(result.total);
    } catch (error) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: `Failed to load companies: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadCompanies();
  };

  const handlePageSizeChange = (value: string | null) => {
    if (value) {
      setPageSize(Number(value));
      setPage(1);
    }
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      platform: '',
      description: '',
      status: '',
      legal_person: '',
      unified_code: '',
      website: '',
      insurance_num: 0,
      self_risk: 0,
      union_risk: 0,
      address: '',
      scope: '',
      tax_no: '',
      industry: '',
      license_number: '',
      reg_capital_value: 0,
      reg_capital_currency: '',
      source_url: '',
      longitude: undefined,
      latitude: undefined,
    });
    openModal();
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      platform: company.platform || '',
      description: company.description || '',
      status: company.status || '',
      legal_person: company.legal_person || '',
      unified_code: company.unified_code || '',
      website: company.website || '',
      insurance_num: company.insurance_num || 0,
      self_risk: company.self_risk || 0,
      union_risk: company.union_risk || 0,
      address: company.address || '',
      scope: company.scope || '',
      tax_no: company.tax_no || '',
      industry: company.industry || '',
      license_number: company.license_number || '',
      reg_capital_value: company.reg_capital_value || 0,
      reg_capital_currency: company.reg_capital_currency || '',
      source_url: company.source_url || '',
      longitude: company.longitude,
      latitude: company.latitude,
    });
    openModal();
  };

  const handleDelete = (company: Company) => {
    setDeletingCompany(company);
    openDelete();
  };

  const handleView = (company: Company) => {
    setViewingCompany(company);
    openView();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingCompany) {
        const data: UpdateCompanyRequest = {
          name: formData.name || undefined,
          platform: formData.platform || undefined,
          description: formData.description || undefined,
          status: formData.status || undefined,
          legal_person: formData.legal_person || undefined,
          unified_code: formData.unified_code || undefined,
          website: formData.website || undefined,
          insurance_num: formData.insurance_num || undefined,
          self_risk: formData.self_risk || undefined,
          union_risk: formData.union_risk || undefined,
          address: formData.address || undefined,
          scope: formData.scope || undefined,
          tax_no: formData.tax_no || undefined,
          industry: formData.industry || undefined,
          license_number: formData.license_number || undefined,
          reg_capital_value: formData.reg_capital_value || undefined,
          reg_capital_currency: formData.reg_capital_currency || undefined,
          source_url: formData.source_url || undefined,
          longitude: formData.longitude,
          latitude: formData.latitude,
        };
        await companyApi.update(editingCompany.id, data);
        showNotification({
          color: 'green',
          title: 'Success',
          message: 'Company updated successfully',
        });
      } else {
        await companyApi.create(formData);
        showNotification({
          color: 'green',
          title: 'Success',
          message: 'Company created successfully',
        });
      }
      closeModal();
      loadCompanies();
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
    if (!deletingCompany) return;
    setSubmitting(true);
    try {
      await companyApi.delete(deletingCompany.id);
      showNotification({
        color: 'green',
        title: 'Success',
        message: 'Company deleted successfully',
      });
      closeDelete();
      loadCompanies();
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
      <Title order={2}>公司数据</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group>
          <TextInput
            placeholder="公司名称"
            value={searchName}
            onChange={(e) => setSearchName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <TextInput
            placeholder="行业"
            value={searchIndustry}
            onChange={(e) => setSearchIndustry(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>搜索</Button>
          <SegmentedControl
            value={viewMode}
            onChange={(v) => setViewMode(v as 'table' | 'map')}
            data={[
              { label: '表格视图', value: 'table' },
              { label: '地图视图', value: 'map' },
            ]}
          />
          <Button ml="auto" onClick={handleCreate}>
            新增公司
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
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>公司名称</Table.Th>
                  <Table.Th>公司状态</Table.Th>
                  <Table.Th>行业</Table.Th>
                  <Table.Th>社保人数</Table.Th>
                  <Table.Th>自身风险</Table.Th>
                  <Table.Th>关联风险</Table.Th>
                  <Table.Th>数据来源更新时间</Table.Th>
                  <Table.Th>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {companies.map((company) => (
                  <Table.Tr key={company.id}>
                    <Table.Td>{company.name}</Table.Td>
                    <Table.Td>{company.status || '-'}</Table.Td>
                    <Table.Td>{company.industry || '-'}</Table.Td>
                    <Table.Td>{company.insurance_num ?? '-'}</Table.Td>
                    <Table.Td>{company.self_risk ?? '-'}</Table.Td>
                    <Table.Td>{company.union_risk ?? '-'}</Table.Td>
                    <Table.Td>
                      {company.source_refresh_datetime
                        ? company.source_refresh_datetime.slice(0, 10)
                        : '-'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => handleView(company)}
                        >
                          查看
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => handleEdit(company)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(company)}
                        >
                          删除
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
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
                  公司列表 ({total})
                </Text>
              </div>
              <ScrollArea className={classes.sidebarContent}>
                {loading ? (
                  <Stack gap="xs" p="sm">
                    <Skeleton height={50} radius="md" />
                    <Skeleton height={50} radius="md" />
                    <Skeleton height={50} radius="md" />
                  </Stack>
                ) : companies.length === 0 ? (
                  <div className={classes.noCoords}>暂无数据</div>
                ) : (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className={`${classes.listItem} ${
                        selectedItemId === company.id ? classes.selected : ''
                      }`}
                      onClick={() => setSelectedItemId(company.id)}
                      onDoubleClick={() => handleView(company)}
                    >
                      <div className={classes.listItemTitle}>
                        {company.name || '-'}
                      </div>
                      <div className={classes.listItemSubtitle}>
                        {company.industry || '-'}
                        {company.insurance_num != null && (
                          <Badge size="xs" variant="light" color="blue" ml="xs">
                            社保{company.insurance_num}人
                          </Badge>
                        )}
                      </div>
                      <div className={classes.listItemSubtitle}>
                        {company.address || '-'}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              {totalPages > 1 && (
                <div className={classes.sidebarFooter}>
                  <Pagination
                    value={page}
                    onChange={(p) => {
                      setPage(p);
                      setSelectedItemId(null);
                    }}
                    total={totalPages}
                    size="sm"
                  />
                </div>
              )}
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
                type="company"
                items={companies
                  .filter(
                    (company) =>
                      company.longitude != null && company.latitude != null
                  )
                  .map((company) => ({
                    id: company.id,
                    name: company.name || '',
                    address: company.address,
                    longitude: company.longitude,
                    latitude: company.latitude,
                    company: company.industry,
                  }))}
                selectedId={selectedItemId}
                onItemClick={(id) => {
                  setSelectedItemId(id);
                  const company = companies.find((c) => c.id === id);
                  if (company) handleView(company);
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
                { value: '20', label: '20/页' },
                { value: '50', label: '50/页' },
                { value: '100', label: '100/页' },
                { value: '200', label: '200/页' },
                { value: '500', label: '500/页' },
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
        title={editingCompany ? '编辑公司' : '新增公司'}
        size="lg"
      >
        <Stack>
          <TextInput
            label="公司名称"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            required
          />
          <TextInput
            label="平台"
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.currentTarget.value })
            }
          />
          <TextInput
            label="行业"
            value={formData.industry}
            onChange={(e) =>
              setFormData({ ...formData, industry: e.currentTarget.value })
            }
          />
          <TextInput
            label="公司地址"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.currentTarget.value })
            }
          />
          <Group grow>
            <NumberInput
              label="经度"
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
              label="纬度"
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
          <Textarea
            label="公司简介"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.currentTarget.value })
            }
          />
          <TextInput
            label="公司官网"
            value={formData.website}
            onChange={(e) =>
              setFormData({ ...formData, website: e.currentTarget.value })
            }
          />
          <Group grow>
            <TextInput
              label="法定代表人"
              value={formData.legal_person}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  legal_person: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label="统一社会信用代码"
              value={formData.unified_code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unified_code: e.currentTarget.value,
                })
              }
            />
          </Group>
          <Group grow>
            <NumberInput
              label="注册资本"
              value={formData.reg_capital_value}
              onChange={(val) =>
                setFormData({ ...formData, reg_capital_value: Number(val) })
              }
              min={0}
            />
            <TextInput
              label="注册资本货币"
              value={formData.reg_capital_currency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reg_capital_currency: e.currentTarget.value,
                })
              }
            />
          </Group>
          <TextInput
            label="经营范围"
            value={formData.scope}
            onChange={(e) =>
              setFormData({ ...formData, scope: e.currentTarget.value })
            }
          />
          <TextInput
            label="营业执照号"
            value={formData.license_number}
            onChange={(e) =>
              setFormData({
                ...formData,
                license_number: e.currentTarget.value,
              })
            }
          />
          <TextInput
            label="税务登记号"
            value={formData.tax_no}
            onChange={(e) =>
              setFormData({ ...formData, tax_no: e.currentTarget.value })
            }
          />
          <TextInput
            label="公司链接"
            value={formData.source_url}
            onChange={(e) =>
              setFormData({ ...formData, source_url: e.currentTarget.value })
            }
          />
          <Button onClick={handleSubmit} loading={submitting}>
            {editingCompany ? '更新' : '创建'}
          </Button>
        </Stack>
      </Modal>

      <Modal opened={openedDelete} onClose={closeDelete} title="确认删除">
        <Text>
          确定要删除公司 "{deletingCompany?.name}" 吗？此操作不可恢复。
        </Text>
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
        title="公司详情"
        size="md"
        position="right"
      >
        {viewingCompany && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                公司名称
              </Text>
              <Text size="lg" fw={500}>
                {viewingCompany.name || '-'}
              </Text>
            </div>
            <Divider />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  平台
                </Text>
                <Text size="md">{viewingCompany.platform || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  行业
                </Text>
                <Text size="md">{viewingCompany.industry || '-'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                公司简介
              </Text>
              <Text size="md" style={{ whiteSpace: 'pre-wrap' }}>
                {viewingCompany.description || '-'}
              </Text>
            </div>
            <Divider label="工商信息" labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  法定代表人
                </Text>
                <Text size="md">{viewingCompany.legal_person || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  统一社会信用代码
                </Text>
                <Text size="md">{viewingCompany.unified_code || '-'}</Text>
              </div>
            </Group>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  注册资本
                </Text>
                <Text size="md">
                  {viewingCompany.reg_capital_value
                    ? `${viewingCompany.reg_capital_value} ${
                        viewingCompany.reg_capital_currency || ''
                      }`
                    : '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  营业执照号
                </Text>
                <Text size="md">{viewingCompany.license_number || '-'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                税务登记号
              </Text>
              <Text size="md">{viewingCompany.tax_no || '-'}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                成立日期
              </Text>
              <Text size="md">{viewingCompany.start_date || '-'}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                公司状态
              </Text>
              <Text size="md">{viewingCompany.status || '-'}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                经营范围
              </Text>
              <Text size="md">{viewingCompany.scope || '-'}</Text>
            </div>
            <Divider label="地址信息" labelPosition="left" />
            <div>
              <Text size="sm" c="dimmed">
                公司地址
              </Text>
              <Text size="md">{viewingCompany.address || '-'}</Text>
            </div>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  经度
                </Text>
                <Text size="md">{viewingCompany.longitude || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  纬度
                </Text>
                <Text size="md">{viewingCompany.latitude || '-'}</Text>
              </div>
            </Group>
            {viewingCompany.longitude && viewingCompany.latitude && (
              <LocationMap
                mode="single"
                longitude={viewingCompany.longitude}
                latitude={viewingCompany.latitude}
                name={viewingCompany.name}
                address={viewingCompany.address}
                height={250}
              />
            )}
            <Divider label="风险信息" labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  社保人数
                </Text>
                <Text size="md">{viewingCompany.insurance_num || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  自身风险
                </Text>
                <Text size="md">{viewingCompany.self_risk || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  关联风险
                </Text>
                <Text size="md">{viewingCompany.union_risk || '-'}</Text>
              </div>
            </Group>
            <Divider label="联系方式" labelPosition="left" />
            <div>
              <Text size="sm" c="dimmed">
                官网
              </Text>
              {viewingCompany.website ? (
                <Text size="md" c="blue">
                  <a
                    href={viewingCompany.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {viewingCompany.website}
                  </a>
                </Text>
              ) : (
                <Text size="md">-</Text>
              )}
            </div>
            <div>
              <Text size="sm" c="dimmed">
                公司链接
              </Text>
              {viewingCompany.source_url ? (
                <Text size="md" c="blue" style={{ wordBreak: 'break-all' }}>
                  <a
                    href={viewingCompany.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {viewingCompany.source_url}
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
                  数据来源更新时间
                </Text>
                <Text size="md">
                  {viewingCompany.source_refresh_datetime
                    ?.slice(0, 19)
                    .replace('T', ' ') || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  创建时间
                </Text>
                <Text size="md">
                  {viewingCompany.create_datetime
                    ?.slice(0, 19)
                    .replace('T', ' ') || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  更新时间
                </Text>
                <Text size="md">
                  {viewingCompany.update_datetime
                    ?.slice(0, 19)
                    .replace('T', ' ') || '-'}
                </Text>
              </div>
            </Group>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
