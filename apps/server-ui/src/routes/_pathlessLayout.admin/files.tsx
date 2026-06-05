import { createFileRoute } from '@tanstack/react-router';
import {
  ActionIcon,
  Collapse,
  CopyButton,
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
  Popover,
  Skeleton,
  Select,
  Badge,
  Input,
  Code,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { fileApi, FileItem, SearchFileParam } from '@/api/file';
import { instance, postJson } from '@/api/http';
import { handleApiError } from '@/api/error';
import { useTranslation } from 'react-i18next';
import { DateTimePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import { formatLocalDate } from '@/utils/date';
import ExcelPreview from '@/components/ExcelPreview';

export const Route = createFileRoute('/_pathlessLayout/admin/files')({
  component: RouteComponent,
});

interface ApiPageResult<T> {
  items: T[];
  total: number;
  num: number;
  size: number;
}

function convertToAbbreviation(num: number | undefined): string {
  if (num == null) return '-';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumSignificantDigits: 3,
  }).format(num);
}

function getFileExtension(name: string | undefined): string {
  if (!name) return '';
  return name.split('.').pop()?.toLowerCase() || '';
}

function getFileName(name: string | undefined): string {
  if (!name) return '';
  const ext = getFileExtension(name);
  return ext ? name.slice(0, -(ext.length + 1)) : name;
}

function RouteComponent() {
  const { t } = useTranslation(['file', 'common']);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchSha, setSearchSha] = useState('');
  const [searchIsDelete, setSearchIsDelete] = useState<string | null>('false');

  const [createStart, setCreateStart] = useState<Date | null>(null);
  const [createEnd, setCreateEnd] = useState<Date | null>(null);
  const [updateStart, setUpdateStart] = useState<Date | null>(null);
  const [updateEnd, setUpdateEnd] = useState<Date | null>(null);

  const [orderBy, setOrderBy] = useState('create_datetime');
  const [orderDir, setOrderDir] = useState('desc');

  const [openedAdvanced, { toggle: toggleAdvanced }] = useDisclosure(false);
  const [openedPreview, { open: openPreview, close: closePreview }] =
    useDisclosure(false);
  const [openedDelete, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [isJsonPreview, setIsJsonPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewExcelData, setPreviewExcelData] = useState<ArrayBuffer | null>(
    null,
  );
  const [deletingFile, setDeletingFile] = useState<FileItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadFiles = async () => {
    setLoading(true);
    try {
      const param: SearchFileParam = {
        page: { num: page, size: pageSize },
        id: searchId || undefined,
        name: searchName || undefined,
        sha: searchSha || undefined,
        is_delete:
          searchIsDelete === '' || searchIsDelete === null
            ? undefined
            : searchIsDelete === 'true',
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
        order_by: orderBy,
        order_dir: orderDir,
      };
      const result = await postJson<ApiPageResult<FileItem>>(
        '/api/file/search',
        param,
      );
      setFiles(result.items);
      setTotal(result.total);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [page, pageSize, orderBy, orderDir]);

  const handleSearch = () => {
    setPage(1);
    loadFiles();
  };

  const handleReset = () => {
    setSearchId('');
    setSearchName('');
    setSearchSha('');
    setSearchIsDelete('');
    setCreateStart(null);
    setCreateEnd(null);
    setUpdateStart(null);
    setUpdateEnd(null);
    setPage(1);
    loadFiles();
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

  const handlePreview = async (file: FileItem) => {
    const ext = getFileExtension(file.name);
    const baseName = getFileName(file.name);
    setPreviewTitle(`(${baseName}.${ext}[${file.id}])`);
    setPreviewKey((k) => k + 1);

    if (ext === 'json') {
      try {
        const url = fileApi.getContentUrl(file.id);
        const resp = await instance.get(url, { responseType: 'arraybuffer' });
        const text = new TextDecoder('utf-8').decode(resp.data);
        try {
          setPreviewContent(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setPreviewContent(text);
        }
        setIsJsonPreview(true);
        setPreviewExcelData(null);
        openPreview();
      } catch (e) {
        handleApiError(e);
      }
    } else {
      try {
        const url = fileApi.getContentUrl(file.id);
        const resp = await instance.get(url, { responseType: 'arraybuffer' });
        let excelBuf: ArrayBuffer;
        if (ext === 'zip') {
          const zip = await JSZip.loadAsync(resp.data);
          const xlsxFile = zip.file(`${baseName}.xlsx`);
          if (!xlsxFile) throw new Error(`${baseName}.xlsx not found in zip`);
          excelBuf = await xlsxFile.async('arraybuffer');
        } else {
          excelBuf = resp.data;
        }
        setIsJsonPreview(false);
        setPreviewContent(null);
        setPreviewExcelData(excelBuf);
        openPreview();
      } catch (e) {
        handleApiError(e);
      }
    }
  };

  const handleClosePreview = () => {
    closePreview();
    setPreviewContent(null);
    setPreviewExcelData(null);
  };

  const handleDownloadExcel = async (file: FileItem) => {
    try {
      const baseName = getFileName(file.name);
      const url = fileApi.getContentUrl(file.id);
      const resp = await instance.get(url, { responseType: 'arraybuffer' });
      const zip = await JSZip.loadAsync(resp.data);
      const xlsxFile = zip.file(`${baseName}.xlsx`);
      if (!xlsxFile) throw new Error(`${baseName}.xlsx not found in zip`);
      const buf = await xlsxFile.async('arraybuffer');
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${baseName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      handleApiError(e);
    }
  };

  const handleDownloadSource = async (file: FileItem) => {
    try {
      const url = fileApi.getContentUrl(file.id);
      const resp = await instance.get(url, { responseType: 'blob' });
      const blob = resp.data as Blob;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name || 'file.bin';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      handleApiError(e);
    }
  };

  const handleDelete = (file: FileItem) => {
    setDeletingFile(file);
    openDelete();
  };

  const confirmDelete = async () => {
    if (!deletingFile) return;
    setSubmitting(true);
    try {
      await fileApi.logicDelete([deletingFile.id]);
      showNotification({
        color: 'green',
        title: t('common:success'),
        message: t('file:deleteSuccess'),
      });
      closeDelete();
      loadFiles();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await fileApi.logicDelete(Array.from(selectedIds));
      showNotification({
        color: 'green',
        title: t('common:success'),
        message: t('file:batchDeleteSuccess'),
      });
      setSelectedIds(new Set());
      loadFiles();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const SortIcon = ({ field }: { field: string }) => {
    if (orderBy !== field) return null;
    return (
      <Text span size="xs" c="dimmed">
        {orderDir === 'asc' ? ' ↑' : ' ↓'}
      </Text>
    );
  };

  return (
    <Stack gap="md">
      <Title order={2}>{t('file:title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder={t('file:id')}
              value={searchId}
              onChange={(e) => setSearchId(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              w={120}
              rightSection={
                searchId ? (
                  <Input.ClearButton onClick={() => setSearchId('')} />
                ) : null
              }
              rightSectionPointerEvents="auto"
            />
            <TextInput
              placeholder={t('file:name')}
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
              placeholder={t('file:sha')}
              value={searchSha}
              onChange={(e) => setSearchSha(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              w={120}
              rightSection={
                searchSha ? (
                  <Input.ClearButton onClick={() => setSearchSha('')} />
                ) : null
              }
              rightSectionPointerEvents="auto"
            />
            <Select
              placeholder={t('file:status')}
              value={searchIsDelete}
              onChange={setSearchIsDelete}
              data={[
                { value: '', label: t('file:all') },
                { value: 'false', label: t('file:normal') },
                { value: 'true', label: t('file:deleted') },
              ]}
              w={120}
              clearable
            />
            <Button variant="outline" onClick={toggleAdvanced}>
              {t('file:advancedSearch')}
              <Text span ml={4} size="xs">
                {openedAdvanced ? '▲' : '▼'}
              </Text>
            </Button>
            <Button onClick={handleSearch}>{t('common:search')}</Button>
            <Button variant="default" onClick={handleReset}>
              {t('common:reset')}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                color="red"
                onClick={handleBatchDelete}
                loading={submitting}
              >
                {t('file:batchDelete')} ({selectedIds.size})
              </Button>
            )}
          </Group>
          <Collapse expanded={openedAdvanced}>
            <Group>
              <Stack gap={2} style={{ flex: 1, minWidth: 300 }}>
                <Text size="sm">{t('file:createTime')}</Text>
                <Group gap={4} wrap="nowrap">
                  <DateTimePicker
                    placeholder={t('file:startCreateTime')}
                    value={createStart}
                    onChange={(v) => setCreateStart(v ? new Date(v) : null)}
                    clearable
                    valueFormat="YYYY-MM-DD HH:mm"
                    style={{ flex: 1 }}
                  />
                  <Text size="sm" c="dimmed" style={{ paddingTop: 6 }}>~</Text>
                  <DateTimePicker
                    placeholder={t('file:endCreateTime')}
                    value={createEnd}
                    onChange={(v) => setCreateEnd(v ? new Date(v) : null)}
                    clearable
                    valueFormat="YYYY-MM-DD HH:mm"
                    style={{ flex: 1 }}
                  />
                </Group>
              </Stack>
              <Stack gap={2} style={{ flex: 1, minWidth: 300 }}>
                <Text size="sm">{t('file:updateTime')}</Text>
                <Group gap={4} wrap="nowrap">
                  <DateTimePicker
                    placeholder={t('file:startUpdateTime')}
                    value={updateStart}
                    onChange={(v) => setUpdateStart(v ? new Date(v) : null)}
                    clearable
                    valueFormat="YYYY-MM-DD HH:mm"
                    style={{ flex: 1 }}
                  />
                  <Text size="sm" c="dimmed" style={{ paddingTop: 6 }}>~</Text>
                  <DateTimePicker
                    placeholder={t('file:endUpdateTime')}
                    value={updateEnd}
                    onChange={(v) => setUpdateEnd(v ? new Date(v) : null)}
                    clearable
                    valueFormat="YYYY-MM-DD HH:mm"
                    style={{ flex: 1 }}
                  />
                </Group>
              </Stack>
            </Group>
          </Collapse>
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {loading ? (
          <Stack>
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
            <Skeleton height={50} radius="md" />
          </Stack>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <input
                      type="checkbox"
                      checked={
                        files.length > 0 && selectedIds.size === files.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>
                    {t('file:id')}
                  </Table.Th>
                  <Table.Th style={{ minWidth: 150 }}>
                    {t('file:name')}
                  </Table.Th>
                  <Table.Th style={{ minWidth: 80 }}>
                    {t('file:size')}
                  </Table.Th>
                  <Table.Th style={{ minWidth: 100 }}>
                    {t('file:sha')}
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: 'pointer', minWidth: 80 }}
                    onClick={() => handleSort('is_delete')}
                  >
                    {t('file:status')}
                    <SortIcon field="is_delete" />
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: 'pointer', minWidth: 100 }}
                    onClick={() => handleSort('create_datetime')}
                  >
                    {t('file:createTime')}
                    <SortIcon field="create_datetime" />
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: 'pointer', minWidth: 100 }}
                    onClick={() => handleSort('update_datetime')}
                  >
                    {t('file:updateTime')}
                    <SortIcon field="update_datetime" />
                  </Table.Th>
                  <Table.Th style={{ minWidth: 280 }}>
                    {t('file:actions')}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {files.map((file) => {
                  const ext = getFileExtension(file.name);
                  const isJson = ext === 'json';
                  return (
                    <Table.Tr key={file.id}>
                      <Table.Td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(file.id)}
                          onChange={() => toggleSelect(file.id)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Popover
                          width={300}
                          position="bottom"
                          withArrow
                          shadow="md"
                          disabled={!file.id}
                        >
                          <Popover.Target>
                            <Text
                              size="sm"
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                cursor: file.id ? 'pointer' : undefined,
                              }}
                              truncate="end"
                            >
                              {file.id || '-'}
                            </Text>
                          </Popover.Target>
                          {file.id && (
                            <Popover.Dropdown>
                              <Group gap={4} wrap="nowrap">
                                <Text
                                  size="sm"
                                  style={{
                                    wordBreak: 'break-all',
                                    flex: 1,
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {file.id}
                                </Text>
                                <CopyButton value={file.id}>
                                  {({ copied, copy }) => (
                                    <ActionIcon
                                      color={copied ? 'teal' : 'gray'}
                                      variant="subtle"
                                      size="sm"
                                      onClick={copy}
                                    >
                                      <div
                                        className={
                                          copied
                                            ? 'i-mdi:check'
                                            : 'i-mdi:content-copy'
                                        }
                                      />
                                    </ActionIcon>
                                  )}
                                </CopyButton>
                              </Group>
                            </Popover.Dropdown>
                          )}
                        </Popover>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{file.name || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text title={`${file.size} bytes`} size="sm">
                          {convertToAbbreviation(file.size ?? undefined)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {file.sha ? (
                          <Popover
                            width={300}
                            position="bottom"
                            withArrow
                            shadow="md"
                          >
                            <Popover.Target>
                              <Text
                                size="sm"
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                }}
                                truncate="end"
                              >
                                {file.sha}
                              </Text>
                            </Popover.Target>
                            <Popover.Dropdown>
                              <Group gap={4} wrap="nowrap">
                                <Text
                                  size="sm"
                                  style={{
                                    wordBreak: 'break-all',
                                    flex: 1,
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {file.sha}
                                </Text>
                                <CopyButton value={file.sha}>
                                  {({ copied, copy }) => (
                                    <ActionIcon
                                      color={copied ? 'teal' : 'gray'}
                                      variant="subtle"
                                      size="sm"
                                      onClick={copy}
                                    >
                                      <div
                                        className={
                                          copied
                                            ? 'i-mdi:check'
                                            : 'i-mdi:content-copy'
                                        }
                                      />
                                    </ActionIcon>
                                  )}
                                </CopyButton>
                              </Group>
                            </Popover.Dropdown>
                          </Popover>
                        ) : (
                          '-'
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={file.is_delete ? 'gray' : 'green'}
                          variant="light"
                          size="sm"
                        >
                          {file.is_delete
                            ? t('file:deleted')
                            : t('file:normal')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {formatLocalDate(file.create_datetime)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {formatLocalDate(file.update_datetime)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {!file.is_delete && (
                          <Group gap="xs" wrap="nowrap">
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => handlePreview(file)}
                            >
                              {t('file:preview')}
                            </Button>
                            {!isJson && (
                              <>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() => handleDownloadExcel(file)}
                                >
                                  {t('file:download')}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() => handleDownloadSource(file)}
                                >
                                  {t('file:downloadSource')}
                                </Button>
                              </>
                            )}
                            <Button
                              size="xs"
                              variant="light"
                              color="red"
                              onClick={() => handleDelete(file)}
                            >
                              {t('common:delete')}
                            </Button>
                          </Group>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
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
              { value: '50', label: `50 ${t('file:perPage')}` },
              { value: '100', label: `100 ${t('file:perPage')}` },
              { value: '200', label: `200 ${t('file:perPage')}` },
              { value: '500', label: `500 ${t('file:perPage')}` },
              { value: '1000', label: `1000 ${t('file:perPage')}` },
            ]}
            style={{ width: 100 }}
            size="sm"
          />
        </Group>
      </Card>

      <Modal
        opened={openedPreview}
        onClose={handleClosePreview}
        title={`${t('file:preview')}${previewTitle}`}
        size="90%"
        styles={{
          body: {
            height: 'calc(90vh - 60px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {isJsonPreview && previewContent !== null && (
          <ScrollArea style={{ flex: 1 }}>
            <Code block style={{ whiteSpace: 'pre', fontSize: 13 }}>
              {previewContent}
            </Code>
          </ScrollArea>
        )}
        {!isJsonPreview && previewExcelData !== null && (
          <ExcelPreview key={previewKey} source={previewExcelData} />
        )}
      </Modal>

      <Modal
        opened={openedDelete}
        onClose={closeDelete}
        title={t('file:confirmDelete')}
      >
        <Text>
          {t('file:confirmDeleteMessage', {
            name: deletingFile?.name || '',
          })}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDelete}>
            {t('common:cancel')}
          </Button>
          <Button color="red" onClick={confirmDelete} loading={submitting}>
            {t('common:delete')}
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
