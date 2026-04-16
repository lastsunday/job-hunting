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
  ActionIcon,
  UnstyledButton,
  Input,
} from '@mantine/core';
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from '@tabler/icons-react';
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
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_pathlessLayout/admin/companies')({
  component: RouteComponent,
});

interface SearchParam {
  page: { num: number; size: number };
  name?: string;
  industry?: string;
  legal_person?: string;
  address?: string;
  status?: string;
  order_by?: string;
  order_dir?: string;
}

interface ApiPageResult<T> {
  items: T[];
  total: number;
  num: number;
  size: number;
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

function RouteComponent() {
  const { t } = useTranslation(['company', 'common']);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchIndustry, setSearchIndustry] = useState('');
  const [searchLegalPerson, setSearchLegalPerson] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [orderBy, setOrderBy] = useState('update_datetime');
  const [orderDir, setOrderDir] = useState('desc');
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
    desc: '',
    status: '',
    legal_person: '',
    unified_code: '',
    web_site: '',
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
        legal_person: searchLegalPerson || undefined,
        address: searchAddress || undefined,
        status: searchStatus || undefined,
        order_by: orderBy,
        order_dir: orderDir,
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
  }, [page, pageSize, orderBy, orderDir]);

  const handleSearch = () => {
    setPage(1);
    loadCompanies();
  };

  const handleReset = () => {
    setSearchName('');
    setSearchIndustry('');
    setSearchLegalPerson('');
    setSearchAddress('');
    setSearchStatus('');
    loadCompanies();
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
    setEditingCompany(null);
    setFormData({
      name: '',
      platform: '',
      desc: '',
      status: '',
      legal_person: '',
      unified_code: '',
      web_site: '',
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
      desc: company.desc || '',
      status: company.status || '',
      legal_person: company.legal_person || '',
      unified_code: company.unified_code || '',
      web_site: company.web_site || '',
      source_platform: company.source_platform || '',
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
          desc: formData.desc || undefined,
          status: formData.status || undefined,
          legal_person: formData.legal_person || undefined,
          unified_code: formData.unified_code || undefined,
          web_site: formData.web_site || undefined,
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
      <Title order={2}>{t('company:title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group>
          <TextInput
            placeholder={t('company:pleaseEnterCompanyName')}
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
            placeholder={t('company:pleaseEnterIndustry')}
            value={searchIndustry}
            onChange={(e) => setSearchIndustry(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={120}
            rightSection={
              searchIndustry ? (
                <Input.ClearButton onClick={() => setSearchIndustry('')} />
              ) : null
            }
            rightSectionPointerEvents="auto"
          />
          <TextInput
            placeholder={t('company:pleaseEnterLegalPerson')}
            value={searchLegalPerson}
            onChange={(e) => setSearchLegalPerson(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={120}
            rightSection={
              searchLegalPerson ? (
                <Input.ClearButton onClick={() => setSearchLegalPerson('')} />
              ) : null
            }
            rightSectionPointerEvents="auto"
          />
          <TextInput
            placeholder={t('company:pleaseEnterAddress')}
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
          <TextInput
            placeholder={t('company:pleaseEnterStatus')}
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={120}
            rightSection={
              searchStatus ? (
                <Input.ClearButton onClick={() => setSearchStatus('')} />
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
              { label: t('company:tableView'), value: 'table' },
              { label: t('company:mapView'), value: 'map' },
            ]}
          />
          <Button ml="auto" onClick={handleCreate}>
            {t('company:addCompany')}
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
                      {t('company:serialNumber')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 115 }}>
                      {t('company:companyId')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 150 }}>
                      {t('company:name')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 100 }}>
                      {t('company:legalPerson')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 100 }}>
                      {t('company:registeredCapital')}
                    </Table.Th>
                    <SortableTh
                      field="start_date"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('company:establishmentDate')}
                    </SortableTh>
                    <Table.Th style={{ minWidth: 150 }}>
                      {t('company:companyAddress')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>
                      {t('company:status')}
                    </Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>
                      {t('company:industry')}
                    </Table.Th>
                    <SortableTh
                      field="insurance_num"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('company:insuranceNum')}
                    </SortableTh>
                    <SortableTh
                      field="self_risk"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('company:selfRisk')}
                    </SortableTh>
                    <SortableTh
                      field="union_risk"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('company:unionRisk')}
                    </SortableTh>
                    <SortableTh
                      field="source_refresh_datetime"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={130}
                    >
                      {t('company:sourceUpdateTime')}
                    </SortableTh>
                    <SortableTh
                      field="update_datetime"
                      currentOrderBy={orderBy}
                      currentOrderDir={orderDir}
                      onSort={handleSort}
                      minWidth={100}
                    >
                      {t('company:updateTime')}
                    </SortableTh>
                    <Table.Th style={{ minWidth: 150 }}>
                      {t('company:actions')}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {companies.map((company, index) => (
                    <Table.Tr
                      key={company.id}
                      onClick={() => handleView(company)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Table.Td>{(page - 1) * pageSize + index + 1}</Table.Td>
                      <Table.Td>
                        <Text size="sm" title={company.id}>
                          {company.id.slice(0, 8)}...
                        </Text>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          style={{ display: 'inline', verticalAlign: 'middle' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(company.id);
                            showNotification({
                              color: 'green',
                              message: t('company:copiedToClipboard'),
                            });
                          }}
                        >
                          <div className="i-mdi:content-copy" />
                        </ActionIcon>
                      </Table.Td>
                      <Table.Td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            maxWidth: '150px',
                          }}
                        >
                          <Text
                            size="sm"
                            title={company.name}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {company.name || '-'}
                          </Text>
                          {company.name && (
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              style={{ flexShrink: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(company.name!);
                                showNotification({
                                  color: 'green',
                                  message: t('company:copiedToClipboard'),
                                });
                              }}
                            >
                              <div className="i-mdi:content-copy" />
                            </ActionIcon>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>{company.legal_person || '-'}</Table.Td>
                      <Table.Td>
                        {company.reg_capital_value
                          ? `${company.reg_capital_value} ${
                              company.reg_capital_currency || ''
                            }`
                          : '-'}
                      </Table.Td>
                      <Table.Td>{company.start_date || '-'}</Table.Td>
                      <Table.Td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            maxWidth: '200px',
                          }}
                        >
                          <Text
                            size="sm"
                            title={company.address}
                            style={{
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {company.address || '-'}
                          </Text>
                          {company.address && (
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              style={{
                                flexShrink: 0,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(company.address!);
                                showNotification({
                                  color: 'green',
                                  message: t('company:copiedToClipboard'),
                                });
                              }}
                            >
                              <div className="i-mdi:content-copy" />
                            </ActionIcon>
                          )}
                        </div>
                      </Table.Td>
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
                        {company.update_datetime?.slice(0, 10) || '-'}
                      </Table.Td>
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(company);
                            }}
                          >
                            {t('common:view')}
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(company);
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
                              handleDelete(company);
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
                  {t('company:companyList')} ({total})
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
                  <div className={classes.noCoords}>{t('common:noData')}</div>
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
                            {t('company:insuranceNum')}: {company.insurance_num}
                          </Badge>
                        )}
                      </div>
                      <div className={classes.listItemSubtitle}>
                        {company.address || '-'}
                      </div>
                      <div
                        className={classes.listItemSubtitle}
                        style={{ fontSize: '11px', color: 'dimmed' }}
                      >
                        {company.source_record_id
                          ? `${t(
                              'company:sourceRecordId'
                            )}: ${company.source_record_id.slice(0, 12)}...`
                          : '-'}
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
                      { value: '50', label: `50 ${t('company:perPage')}` },
                      { value: '100', label: `100 ${t('company:perPage')}` },
                      { value: '200', label: `200 ${t('company:perPage')}` },
                      { value: '500', label: `500 ${t('company:perPage')}` },
                      { value: '1000', label: `1000 ${t('company:perPage')}` },
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
                { value: '50', label: `50 ${t('company:perPage')}` },
                { value: '100', label: `100 ${t('company:perPage')}` },
                { value: '200', label: `200 ${t('company:perPage')}` },
                { value: '500', label: `500 ${t('company:perPage')}` },
                { value: '1000', label: `1000 ${t('company:perPage')}` },
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
        title={
          editingCompany ? t('company:editCompany') : t('company:addNewCompany')
        }
        size="lg"
      >
        <Stack>
          <TextInput
            label={t('company:name')}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            required
          />
          <TextInput
            label={t('company:platform')}
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('company:industry')}
            value={formData.industry}
            onChange={(e) =>
              setFormData({ ...formData, industry: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('company:companyAddress')}
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.currentTarget.value })
            }
          />
          <Group grow>
            <NumberInput
              label={t('company:longitude')}
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
              label={t('company:latitude')}
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
            label={t('company:companyDescription')}
            value={formData.desc}
            onChange={(e) =>
              setFormData({ ...formData, desc: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('company:officialWebsite')}
            value={formData.web_site}
            onChange={(e) =>
              setFormData({ ...formData, web_site: e.currentTarget.value })
            }
          />
          <Group grow>
            <TextInput
              label={t('company:legalPerson')}
              value={formData.legal_person}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  legal_person: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label={t('company:unifiedCode')}
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
              label={t('company:registeredCapital')}
              value={formData.reg_capital_value}
              onChange={(val) =>
                setFormData({ ...formData, reg_capital_value: Number(val) })
              }
              min={0}
            />
            <TextInput
              label={t('company:registeredCapitalCurrency')}
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
            label={t('company:businessScope')}
            value={formData.scope}
            onChange={(e) =>
              setFormData({ ...formData, scope: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('company:businessLicense')}
            value={formData.license_number}
            onChange={(e) =>
              setFormData({
                ...formData,
                license_number: e.currentTarget.value,
              })
            }
          />
          <TextInput
            label={t('company:taxNo')}
            value={formData.tax_no}
            onChange={(e) =>
              setFormData({ ...formData, tax_no: e.currentTarget.value })
            }
          />
          <TextInput
            label={t('company:companyLink')}
            value={formData.source_url}
            onChange={(e) =>
              setFormData({ ...formData, source_url: e.currentTarget.value })
            }
          />
          <Button onClick={handleSubmit} loading={submitting}>
            {editingCompany ? t('common:update') : t('common:create')}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={openedDelete}
        onClose={closeDelete}
        title={t('company:confirmDelete')}
      >
        <Text>
          {t('company:confirmDeleteMessage', {
            name: deletingCompany?.name || '',
          })}
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
        title={t('company:companyDetails')}
        size="md"
        position="right"
      >
        {viewingCompany && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                {t('company:companyId')}
              </Text>
              <Group gap="xs">
                <Text
                  size="md"
                  fw={500}
                  title={viewingCompany.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigator.clipboard.writeText(viewingCompany.id)
                  }
                >
                  {viewingCompany.id.slice(0, 12)}...
                </Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    navigator.clipboard.writeText(viewingCompany.id);
                    showNotification({
                      color: 'green',
                      message: t('company:copiedToClipboard'),
                    });
                  }}
                >
                  <div className="i-mdi:content-copy" />
                </ActionIcon>
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:sourceRecordId')}
              </Text>
              <Group gap="xs">
                <Text
                  size="md"
                  title={viewingCompany.source_record_id}
                  style={{ wordBreak: 'break-all' }}
                >
                  {viewingCompany.source_record_id || '-'}
                </Text>
                {viewingCompany.source_record_id && (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        viewingCompany.source_record_id!
                      );
                      showNotification({
                        color: 'green',
                        message: t('company:copiedToClipboard'),
                      });
                    }}
                  >
                    <div className="i-mdi:content-copy" />
                  </ActionIcon>
                )}
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:name')}
              </Text>
              <Text size="lg" fw={500}>
                {viewingCompany.name || '-'}
              </Text>
            </div>
            <Divider />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:platform')}
                </Text>
                <Text size="md">{viewingCompany.platform || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:industry')}
                </Text>
                <Text size="md">{viewingCompany.industry || '-'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:companyDescription')}
              </Text>
              <Text size="md" style={{ whiteSpace: 'pre-wrap' }}>
                {viewingCompany.desc || '-'}
              </Text>
            </div>
            <Divider label={t('company:businessInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:legalPerson')}
                </Text>
                <Text size="md">{viewingCompany.legal_person || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:unifiedCode')}
                </Text>
                <Text size="md">{viewingCompany.unified_code || '-'}</Text>
              </div>
            </Group>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:registeredCapital')}
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
                  {t('company:paidinCapital')}
                </Text>
                <Text size="md">
                  {viewingCompany.paidin_capital_value
                    ? `${viewingCompany.paidin_capital_value} ${
                        viewingCompany.paidin_capital_currency || ''
                      }`
                    : '-'}
                </Text>
              </div>
            </Group>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:businessLicense')}
                </Text>
                <Text size="md">{viewingCompany.license_number || '-'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:taxNo')}
              </Text>
              <Text size="md">{viewingCompany.tax_no || '-'}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:establishmentDate')}
              </Text>
              <Text size="md">{viewingCompany.start_date || '-'}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:status')}
              </Text>
              <Text size="md">{viewingCompany.status || '-'}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:businessScope')}
              </Text>
              <Text size="md">{viewingCompany.scope || '-'}</Text>
            </div>
            <Divider label={t('company:addressInfo')} labelPosition="left" />
            <div>
              <Text size="sm" c="dimmed">
                {t('company:companyAddress')}
              </Text>
              <Text size="md">{viewingCompany.address || '-'}</Text>
            </div>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:longitude')}
                </Text>
                <Text size="md">{viewingCompany.longitude || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:latitude')}
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
            <Divider label={t('company:riskInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:insuranceNum')}
                </Text>
                <Text size="md">{viewingCompany.insurance_num || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:selfRisk')}
                </Text>
                <Text size="md">{viewingCompany.self_risk || '-'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:unionRisk')}
                </Text>
                <Text size="md">{viewingCompany.union_risk || '-'}</Text>
              </div>
            </Group>
            <Divider label={t('company:contactInfo')} labelPosition="left" />
            <div>
              <Text size="sm" c="dimmed">
                {t('company:officialWebsite')}
              </Text>
              {viewingCompany.web_site ? (
                <Text size="md" c="blue">
                  <a
                    href={viewingCompany.web_site}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {viewingCompany.web_site}
                  </a>
                </Text>
              ) : (
                <Text size="md">-</Text>
              )}
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t('company:companyLink')}
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
            <Divider label={t('company:timeInfo')} labelPosition="left" />
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:sourceRefreshTime')}
                </Text>
                <Text size="md">
                  {viewingCompany.source_refresh_datetime
                    ?.slice(0, 19)
                    .replace('T', ' ') || '-'}
                </Text>
              </div>
            </Group>
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:createTime')}
                </Text>
                <Text size="md">
                  {viewingCompany.create_datetime
                    ?.slice(0, 19)
                    .replace('T', ' ') || '-'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  {t('company:updateTime')}
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
