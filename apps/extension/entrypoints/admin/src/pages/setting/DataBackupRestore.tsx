import {
  DATA_TYPE_NAME_COMPANY,
  DATA_TYPE_NAME_COMPANY_TAG,
  DATA_TYPE_NAME_JOB,
  DATA_TYPE_NAME_JOB_SNAPSHOT,
  DATA_TYPE_NAME_JOB_TAG,
} from '@/common';
import { validImportData } from '@/common/excel';
import { downloadBlob } from '@/common/file';
import { zipAdvanceFileToBlob, unzipAdvanceFileToJson } from '@/common/zip';
import { Icon } from '@iconify/react';
import {
  Button,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Spin,
  Typography,
  notification,
} from 'antd';
import dayjs from 'dayjs';
import { read, utils, writeFileXLSX } from 'xlsx';
const { Text } = Typography;
export type DataBackupRestoreProps = {
  title: string;
  getExcelJsonArrayFunction: (
    pageNum?: number,
    pageSize?: number
  ) => Promise<any>;
  getDataTotalFunction: () => Promise<number>;
  getMaxExportCount: () => Promise<number>;
  fileHeader: string[];
  saveDataFunction: (data: any) => Promise<any>;
  format?: 'xlsx' | 'json';
  accept?: string;
  dataType?:
    | DATA_TYPE_NAME_JOB
    | DATA_TYPE_NAME_COMPANY
    | DATA_TYPE_NAME_COMPANY_TAG
    | DATA_TYPE_NAME_JOB_TAG
    | DATA_TYPE_NAME_JOB_SNAPSHOT;
};

const DataBackupRestore: React.FC<DataBackupRestoreProps> = ({
  title,
  getExcelJsonArrayFunction,
  fileHeader,
  saveDataFunction,
  getDataTotalFunction,
  getMaxExportCount,
  format = 'xlsx',
  dataType,
  accept = '.xlsx',
}) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [notificationApi, notificationContextHolder] =
    notification.useNotification({ stack: { threshold: 5 } });

  const [loading, setLoading] = useState(false);

  const key = 'export';
  const importKey = 'import';

  const showNotification = ({
    key = null,
    type = 'info',
    message = dayjs().format('YYYY-MM-DD HH:mm:ss'),
    description,
    duration = 10,
  }) => {
    notificationApi.open({
      key,
      type,
      message,
      description,
      duration,
      pauseOnHover: true,
      showProgress: true,
    });
  };

  const onExport = async () => {
    setExportLoading(true);
    try {
      showNotification({
        key: `${key}${dataType}`,
        type: 'info',
        description: (
          <>
            <Flex vertical justify="end">
              <Text>正准备导出{title}数据</Text>
            </Flex>
          </>
        ),
      });
      const total = await getDataTotalFunction();
      const maxExportCount = await getMaxExportCount();
      let pageTotal = Math.floor(total / maxExportCount);
      if (total % maxExportCount > 0) {
        pageTotal = pageTotal + 1;
      }
      const now = new Date();
      for (let i = 0; i < pageTotal; i++) {
        const pageNum = i + 1;
        showNotification({
          key: `${key}${dataType}`,
          duration: 0,
          description: (
            <>
              <Flex vertical justify="end">
                <Text>
                  导出{title}数据,共{total}条数据
                </Text>
                <Progress
                  size="small"
                  type="circle"
                  steps={pageTotal}
                  trailColor="rgba(0, 0, 0, 0.06)"
                  percent={((pageNum - 1) / pageTotal) * 100}
                  format={() => `${pageNum - 1}/${pageTotal}`}
                />
              </Flex>
            </>
          ),
        });
        const pageSize = maxExportCount;
        const result = await getExcelJsonArrayFunction(pageNum, pageSize);
        const fileName = `${title}-${dayjs(now).format(
          'YYYYMMDDHHmmss'
        )}-(${pageNum}-${pageTotal})`;
        if (format == 'json') {
          const blob = new Blob([JSON.stringify(result)], {
            type: 'plain/text',
          });
          const actualFileName = `${dataType}.json`;
          const data = await zipAdvanceFileToBlob({
            fileName: actualFileName,
            blobData: blob,
          });
          downloadBlob(data, `${fileName}.tar.xz`, 'application/octet-stream');
        } else {
          const ws = utils.json_to_sheet(result);
          const wb = utils.book_new();
          utils.book_append_sheet(wb, ws, 'Data');
          writeFileXLSX(wb, `${fileName}.xlsx`);
        }
      }
      showNotification({
        key: `${key}${dataType}`,
        type: 'success',
        description: (
          <>
            <Flex vertical justify="end">
              <Text>
                导出{title}数据,共{total}条数据
              </Text>
              <Progress size="small" type="circle" percent={100} />
            </Flex>
          </>
        ),
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileImport = async (e) => {
    setFiles(e.target.files);
  };

  const confirmFileImport = async () => {
    if (files && files.length > 0) {
      setImportLoading(true);
      setLoading(true);
      setTimeout(async () => {
        const handle = async (
          key,
          importFileTitle,
          getHeader,
          getDataCallback
        ) => {
          try {
            const headerObj = getHeader();
            const validResultObject = validImportData(headerObj, fileHeader);
            if (!validResultObject.validResult) {
              showNotification({
                key,
                type: 'error',
                description: `${importFileTitle}文件校验失败，缺少数据列(${
                  validResultObject.lackColumn.length
                }):${validResultObject.lackColumn.join(',')}`,
              });
              return;
            }
            const data = getDataCallback();
            if (data) {
              const targetList = await saveDataFunction(data);
              setIsImportModalOpen(false);
              showNotification({
                key,
                type: 'success',
                description: `${importFileTitle}导入数据成功，共${targetList.length}条`,
              });
            }
          } catch (e) {
            showNotification({
              key,
              type: 'error',
              description: `${importFileTitle}导入数据失败${e.message}`,
            });
          } finally {
            setLoading(false);
            setImportLoading(false);
          }
        };
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const key = `${importKey}${i}`;
          const importFileTitle = `[${i + 1}/${files.length}-${
            file.name
          }]${title}`;
          if (format == 'json') {
            const actualFileName = `${dataType}.json`;
            const data = await unzipAdvanceFileToJson({
              fileName: actualFileName,
              file,
            });
            await handle(
              key,
              importFileTitle,
              () => {
                return [data && data.length > 0 ? Object.keys(data[0]) : []];
              },
              () => {
                return data;
              }
            );
          } else {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = async function (event) {
              const arrayBuffer = event.target.result;
              const wb = read(arrayBuffer, { cellDates: true });
              await handle(
                key,
                importFileTitle,
                () => {
                  return utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
                    header: 1,
                    UTC: true,
                  });
                },
                () => {
                  const data = utils.sheet_to_json(
                    wb.Sheets[wb.SheetNames[0]],
                    {
                      header: 2,
                      UTC: true,
                    }
                  );
                  return data;
                }
              );
            };
            reader.onerror = function (event) {
              showNotification({
                key,
                type: 'error',
                description: `${importFileTitle}读取文件失败`,
              });
            };
          }
        }
      }, 0);
    } else {
      showNotification({
        type: 'error',
        description: `请选择有效的${title}文件`,
      });
    }
  };

  return (
    <>
      {notificationContextHolder}
      <Spin spinning={loading} fullscreen />
      <Flex vertical gap={5}>
        <Text>{title}</Text>
        <Flex gap={5}>
          <Popconfirm
            title="导出数据"
            description="确认导出数据？"
            onConfirm={onExport}
            okText="是"
            cancelText="否"
          >
            <Button loading={exportLoading}>
              <Icon icon="mdi:document" />
              全量{title}数据导出
            </Button>
          </Popconfirm>
          <Button
            onClick={() => {
              setImportLoading(false);
              setIsImportModalOpen(true);
            }}
          >
            <Icon icon="mdi:file-document-box-plus" />
            {title}数据导入
          </Button>
        </Flex>
      </Flex>
      <Modal
        title={`${title}数据导入`}
        open={isImportModalOpen}
        onCancel={() => {
          setIsImportModalOpen(false);
        }}
        footer={null}
        style={{ maxWidth: '500px' }}
        width="80%"
        destroyOnClose
      >
        <Flex vertical gap={5}>
          <Text type="danger">注意：相同{title}的数据会被替换!!!</Text>
          <Text>请选择{title}备份文件</Text>
          <Flex vertical gap={10}>
            <Input
              type="file"
              accept={accept}
              multiple
              onChange={handleFileImport}
            ></Input>
            <Flex justify="end">
              <Button
                type="primary"
                onClick={confirmFileImport}
                loading={importLoading}
              >
                确定
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};
export default DataBackupRestore;
