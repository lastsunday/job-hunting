import {
  ActionIcon,
  CopyButton,
  Group,
  Pagination,
  Popover,
  ScrollArea,
  Select,
  Table,
  Text,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { read, utils } from 'xlsx';

export type ExcelPreviewProps = {
  source: ArrayBuffer;
};

const ExcelPreview: React.FC<ExcelPreviewProps> = ({ source }) => {
  const { t } = useTranslation(['common']);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('50');

  useEffect(() => {
    setPage(1);
    const wb = read(source, { cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const headerArray = utils.sheet_to_json<(string | Date | number)[]>(sheet, {
      header: 1,
    });
    if (headerArray.length > 0) {
      const headers = (headerArray[0] as (string | Date | number)[]).map(
        (h) => String(h),
      );
      setColumns(headers);
      const data = utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      });
      setRows(data);
    }
  }, [source]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  if (columns.length === 0) {
    return <Text c="dimmed">No data</Text>;
  }

  const size = Number(pageSize);
  const totalPages = Math.ceil(rows.length / size);
  const currentRows = rows.slice((page - 1) * size, page * size);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ScrollArea style={{ flex: 1 }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta="center" w={60}>
                #
              </Table.Th>
              {columns.map((col, i) => (
                <Table.Th key={i} ta="center">
                  {col}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {currentRows.map((row, rowIdx) => (
              <Table.Tr key={rowIdx}>
                <Table.Td ta="center">
                  {(page - 1) * size + rowIdx + 1}
                </Table.Td>
                {columns.map((col, colIdx) => {
                  const val = row[col];
                  const str = val != null ? String(val) : '';
                  return (
                    <Popover
                      key={colIdx}
                      width={400}
                      position="bottom"
                      withArrow
                      shadow="md"
                      disabled={!str}
                    >
                      <Popover.Target>
                        <Table.Td
                          maw={400}
                          style={{ cursor: str ? 'pointer' : undefined }}
                        >
                          <Text truncate="end">{str}</Text>
                        </Table.Td>
                      </Popover.Target>
                      {str && (
                        <Popover.Dropdown>
                          <Group gap={4} wrap="nowrap">
                            <Text
                              size="sm"
                              style={{ wordBreak: 'break-all', flex: 1 }}
                            >
                              {str}
                            </Text>
                            <CopyButton value={str}>
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
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Group justify="center" mt="sm">
        <Pagination
          value={Math.min(page, Math.max(1, totalPages))}
          onChange={setPage}
          total={Math.max(1, totalPages)}
        />
        <Select
          value={pageSize}
          onChange={(v) => v && setPageSize(v)}
          data={['50', '100', '200', '500', '1000'].map((v) => ({
            value: v,
            label: `${v} ${t('perPage')}`,
          }))}
          w={110}
          size="sm"
        />
      </Group>
    </div>
  );
};

export default ExcelPreview;
