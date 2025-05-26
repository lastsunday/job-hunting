import { UI_DEFAULT_PAGE_SIZE } from '@/common/config';
import { DownOutlined } from '@ant-design/icons';
import {
  Button,
  Flex,
  Form,
  GetProp,
  Popconfirm,
  Row,
  Space,
  Table,
  TableColumnsType,
  TablePaginationConfig,
  TableProps,
  theme,
  Typography,
} from 'antd';
import { SorterResult, TableRowSelection } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { forwardRef, useImperativeHandle } from 'react';
import { utils, writeFileXLSX } from 'xlsx';
import { downloadBlob } from '@/common/file';
import { zipFileToBlob, zipAdvanceFileToBlob } from '@/common/zip';
const { Text } = Typography;
dayjs.extend(duration);

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: SorterResult<any>['field'];
  sortOrder?: SorterResult<any>['order'];
  filters?: Parameters<GetProp<TableProps, 'onChange'>>[1];
}

export type BasicTableProps = {
  searchProps: {
    columns: TableColumnsType<any>;
    searchFields?: {
      common?: JSX.Element[];
      expand?: JSX.Element[];
    };
    fillSearchParam?: (searchParam, values: any) => any;
    convertSortField?: (key: any) => string;
    search: (searchParam) => Promise<any>;
    convertToDataList?: (data: any) => any;
    orderByColumn?: string;
    searchParam?: any;
  };
  rowKeyFunction?: (record) => string;
  onCheckboxDisableCheck?: (record) => boolean;
  expandedRowRender?: (record) => JSX.Element;
  exportProps?: {
    dataToExcelJSONArray: (originalData: any) => any;
    getFullDataFunction?: (originalData: any) => Promise<any>;
    format?: 'xlsx' | 'json';
    zipFormat?: 'zip' | 'tar.xz';
    title: string;
    dataFileName?: string;
  };
  mode?: Array<'c' | 'r' | 'u' | 'd' | 'a'>;
  onAdd?: () => void;
  onAppend?: (keys: React.Key[]) => Promise<void>;
  onDelete?: (keys: React.Key[]) => Promise<void>;
  additionMenu?: JSX.Element;
};

const BasicTable = forwardRef(function Component(props: BasicTableProps, ref) {
  const {
    searchProps,
    expandedRowRender,
    exportProps,
    mode,
    onAdd,
    onAppend,
    onDelete,
    rowKeyFunction,
    onCheckboxDisableCheck,
    additionMenu,
  } = props;

  const {
    columns,
    searchFields,
    fillSearchParam,
    convertSortField,
    search,
    convertToDataList,
    orderByColumn = 'updateDatetime',
    searchParam: defaultSearchParam = {},
  } = searchProps;
  const {
    dataToExcelJSONArray,
    title,
    getFullDataFunction,
    format,
    zipFormat,
    dataFileName = 'data',
  } = exportProps || {};

  const [dataSource, setDataSource] = useState<any>();
  const [originalData, setOriginalData] = useState();
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState<any>(
    Object.assign(
      {
        pageNum: 1,
        pageSize: UI_DEFAULT_PAGE_SIZE,
        orderByColumn,
        orderBy: 'DESC',
      },
      defaultSearchParam
    )
  );
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: UI_DEFAULT_PAGE_SIZE,
      showSizeChanger: true,
      pageSizeOptions: [10, 20, 50, 100, 200, 500, 1000],
      position: ['topRight', 'bottomRight'],
      showTotal: (total) => `共 ${total} 条`,
    },
  });
  const [refresh, setRefresh] = useState(false);

  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const [expand, setExpand] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [appendLoading, setAppendLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      setRefresh(!refresh);
    },
  }));

  const fetchData = () => {
    (async () => {
      setLoading(true);
      const searchResult = await search(searchParam);
      setDataSource(
        convertToDataList
          ? convertToDataList(searchResult.items)
          : searchResult.items
      );
      setOriginalData(searchResult.items);
      setLoading(false);
      tableParams.pagination.total = searchResult.total;
      setTableParams(tableParams);
    })();
  };

  useEffect(fetchData, [
    tableParams.pagination?.current,
    tableParams.pagination?.pageSize,
    tableParams?.sortOrder,
    tableParams?.sortField,
    JSON.stringify(tableParams.filters),
    refresh,
  ]);

  const handleTableChange: TableProps<any>['onChange'] = (
    pagination,
    filters,
    sorter
  ) => {
    searchParam.pageNum = pagination.current;
    searchParam.pageSize = pagination.pageSize;
    if (sorter.field && sorter.order && convertSortField) {
      searchParam.orderByColumn = convertSortField(sorter.field);
      if (sorter.order === 'descend') {
        searchParam.orderBy = 'DESC';
      } else {
        searchParam.orderBy = 'ASC';
      }
    } else {
      searchParam.orderByColumn = 'updateDatetime';
      searchParam.orderBy = 'DESC';
    }
    setSearchParam(searchParam);
    setTableParams({
      pagination,
      filters,
      sortOrder: Array.isArray(sorter) ? undefined : sorter.order,
      sortField: Array.isArray(sorter) ? undefined : sorter.field,
    });
    // `dataSource` is useless since `pageSize` changed
    if (pagination.pageSize !== tableParams.pagination?.pageSize) {
      setDataSource([]);
    }
  };

  const onFinish = (values: any) => {
    tableParams.pagination.current = 1;
    searchParam.pageNum = 1;
    fillSearchParam ? fillSearchParam(searchParam, values) : null;
    setSearchParam(searchParam);
    setTableParams(tableParams);
    setRefresh(!refresh);
  };

  const exportData = async () => {
    try {
      setExportLoading(true);
      const result = dataToExcelJSONArray(
        getFullDataFunction
          ? await getFullDataFunction(originalData)
          : originalData
      );
      const fileName = `${title}-${dayjs(new Date()).format('YYYYMMDDHHmmss')}`;
      if (format == 'json') {
        let data;
        const blob = new Blob([JSON.stringify(result)], { type: 'plain/text' });
        const actualFileName = `${dataFileName}.json`;
        let suffix = `${zipFormat}`;
        if (zipFormat == 'zip') {
          data = await zipFileToBlob(actualFileName, blob);
        } else if (zipFormat == 'tar.xz') {
          data = await zipAdvanceFileToBlob({
            fileName: actualFileName,
            blobData: blob,
          });
        } else {
          data = blob;
          suffix = format;
        }
        downloadBlob(data, `${fileName}.${suffix}`, 'application/octet-stream');
      } else {
        const ws = utils.json_to_sheet(result);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Data');
        writeFileXLSX(wb, `${fileName}.xlsx`);
      }
    } finally {
      setExportLoading(false);
    }
  };

  const createSearchField = () => {
    if (searchFields) {
      if (searchFields.expand && expand) {
        return [...searchFields.common, ...searchFields.expand];
      } else {
        if (searchFields.common) {
          return [...searchFields.common];
        } else {
          return []
        }
      }
    } else {
      return [];
    }
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record) => ({
      disabled: onCheckboxDisableCheck ? onCheckboxDisableCheck(record) : false
    }),
  };

  const hasSelected = selectedRowKeys.length > 0;
  return (
    <>
      <Flex vertical>
        <Space size="small" direction="vertical">
          {mode?.length > 0 ? (
            <Form
              form={form}
              initialValues={defaultSearchParam}
              style={{
                maxWidth: 'none',
                background: token.colorFillAlter,
                borderRadius: token.borderRadiusLG,
                padding: 10,
              }}
              onFinish={onFinish}
            >
              <Row gutter={24}>
                {mode?.includes('r') ? createSearchField() : null}
              </Row>
              <div style={{ textAlign: 'right' }}>
                <Space size="small">
                  <Flex>{additionMenu ? additionMenu : null}</Flex>
                  {mode?.includes('c') ? (
                    <Button
                      variant='dashed'
                      color='default'
                      loading={addLoading}
                      onClick={async () => {
                        if (onAdd) {
                          try {
                            setAddLoading(true);
                            await onAdd();
                          } finally {
                            setAddLoading(false);
                          }
                        }
                      }}
                    >
                      新增
                    </Button>
                  ) : null}
                  {mode?.includes('a') ? (
                    <Popconfirm
                      title="添加"
                      description="确定添加选定的记录？"
                      onConfirm={async () => {
                        if (onAppend) {
                          try {
                            setAppendLoading(true);
                            await onAppend(selectedRowKeys);
                            setSelectedRowKeys([]);
                          } finally {
                            setAppendLoading(false);
                          }
                        }
                      }}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        variant='dashed'
                        loading={appendLoading}
                        disabled={!hasSelected}
                        type="primary"
                      >
                        添加
                      </Button>
                    </Popconfirm>
                  ) : null}
                  {mode?.includes('d') ? (
                    <Popconfirm
                      title="删除记录"
                      description="确定删除选定的记录？"
                      onConfirm={async () => {
                        if (onDelete) {
                          try {
                            setDeleteLoading(true);
                            await onDelete(selectedRowKeys);
                            setSelectedRowKeys([]);
                          } finally {
                            setDeleteLoading(false);
                          }
                        }
                      }}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        loading={deleteLoading}
                        disabled={!hasSelected}
                        danger
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  ) : null}
                  {exportProps ? (
                    <Button
                      type="dashed"
                      loading={exportLoading}
                      onClick={exportData}
                    >
                      导出
                    </Button>
                  ) : null}
                  {mode?.includes('r') ? (
                    <>
                      <Button type="primary" htmlType="submit">
                        查询
                      </Button>
                      <Button
                        onClick={() => {
                          form.resetFields();
                        }}
                      >
                        清除
                      </Button>
                      {searchFields?.expand && searchFields.expand.length > 0 ? (
                        <a
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            setExpand(!expand);
                          }}
                        >
                          <DownOutlined rotate={expand ? 180 : 0} /> 折叠
                        </a>
                      ) : null}
                    </>
                  ) : null}
                </Space>
              </div>
            </Form>
          ) : null}
          <Table<any>
            rowKey={
              rowKeyFunction
                ? (record) => {
                  return rowKeyFunction(record);
                }
                : (record) => record.id
            }
            columns={[
              ...[
                {
                  title: '#',
                  render: (value: string, record, index) => (
                    <Text>
                      {index +
                        1 +
                        (tableParams.pagination.current - 1) *
                        tableParams.pagination.pageSize}
                    </Text>
                  ),
                  minWidth: 50,
                },
              ],
              ...columns,
            ]}
            dataSource={dataSource}
            pagination={tableParams.pagination}
            loading={loading}
            onChange={handleTableChange}
            size="small"
            expandable={{
              expandedRowRender,
            }}
            rowSelection={mode?.includes('d') || mode?.includes("a") ? rowSelection : null}
          />
        </Space>
      </Flex>
    </>
  );
});

export default BasicTable;
