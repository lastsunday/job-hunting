import { DATA_TYPE_NAME_JOB_SNAPSHOT } from '@/common';
import {
  COMPANY_MAX_EXPORT_SIZE,
  COMPANY_TAG_MAX_EXPORT_SIZE,
  JOB_MAX_EXPORT_SIZE,
  JOB_PUBLIC_MAX_EXPORT_SIZE,
  JOB_SNAPSHOT_MAX_EXPORT_SIZE,
  JOB_TAG_MAX_EXPORT_SIZE,
  COMPANY_COMMENT_MAX_EXPORT_SIZE,
} from '@/common/config';
import {
  Card,
  Flex,
  message
} from 'antd';
import React from 'react';
import { useData } from '../hooks/data';
import DataBackupRestore from './setting/DataBackupRestore';
import DatabaseBackupRestore from './setting/DatabaseBackupRestore';

const DataManagementView: React.FC = () => {
  const {
    getJobDataToExcelJsonArray,
    getJobDataTotal,
    saveJobData,
    getJobPublicDataToExcelJsonArray,
    getJobPublicDataTotal,
    saveJobPublicData,
    getCompanyDataToExcelJsonArray,
    getCompanyDataTotal,
    saveCompanyData,
    getCompanyTagDataToExcelJsonArray,
    saveCompanyTagData,
    getCompanyTagDataTotal,
    getJobTagDataToExcelJsonArray,
    saveJobTagData,
    getJobTagDataTotal,
    JOB_FILE_HEADER,
    JOB_PUBLIC_FILE_HEADER,
    COMPANY_FILE_HEADER,
    COMPANY_TAG_FILE_HEADER,
    JOB_TAG_FILE_HEADER,
    JOB_SNAPSHOT_FILE_HEADER,
    saveJobSnapshotData,
    getJobSnapshotDataTotal,
    getJobSnapshotDataToJsonArray,
    getCompanyCommentDataToExcelJsonArray, getCompanyCommentDataTotal, saveCompanyCommentData,
    COMPANY_COMMENT_FILE_HEADER,
  } = useData();
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <>
      {contextHolder}
      <Flex gap="small" wrap vertical>
        <Card title="数据管理" variant="borderless" size="small">
          <Flex vertical gap={5}>
            <DatabaseBackupRestore />
            <Card title="私有数据" variant='outlined' size='small'>
              <DataBackupRestore
                title="职位"
                getExcelJsonArrayFunction={getJobDataToExcelJsonArray}
                fileHeader={JOB_FILE_HEADER}
                saveDataFunction={saveJobData}
                getDataTotalFunction={getJobDataTotal}
                getMaxExportCount={async () => {
                  return JOB_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="公司"
                getExcelJsonArrayFunction={getCompanyDataToExcelJsonArray}
                fileHeader={COMPANY_FILE_HEADER}
                saveDataFunction={saveCompanyData}
                getDataTotalFunction={getCompanyDataTotal}
                getMaxExportCount={async () => {
                  return COMPANY_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="职位标签"
                getExcelJsonArrayFunction={getJobTagDataToExcelJsonArray}
                fileHeader={JOB_TAG_FILE_HEADER}
                saveDataFunction={saveJobTagData}
                getDataTotalFunction={getJobTagDataTotal}
                getMaxExportCount={async () => {
                  return JOB_TAG_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="公司标签"
                getExcelJsonArrayFunction={getCompanyTagDataToExcelJsonArray}
                fileHeader={COMPANY_TAG_FILE_HEADER}
                saveDataFunction={saveCompanyTagData}
                getDataTotalFunction={getCompanyTagDataTotal}
                getMaxExportCount={async () => {
                  return COMPANY_TAG_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="职位快照"
                getExcelJsonArrayFunction={getJobSnapshotDataToJsonArray}
                fileHeader={JOB_SNAPSHOT_FILE_HEADER}
                saveDataFunction={saveJobSnapshotData}
                getDataTotalFunction={getJobSnapshotDataTotal}
                getMaxExportCount={async () => {
                  return JOB_SNAPSHOT_MAX_EXPORT_SIZE;
                }}
                dataType={DATA_TYPE_NAME_JOB_SNAPSHOT}
                format="json"
                accept=".tar.xz"
              />
            </Card>
            <Card title="公开数据" variant='outlined' size='small'>
              <DataBackupRestore
                title="职位公开数据"
                getExcelJsonArrayFunction={getJobPublicDataToExcelJsonArray}
                fileHeader={JOB_PUBLIC_FILE_HEADER}
                saveDataFunction={saveJobPublicData}
                getDataTotalFunction={getJobPublicDataTotal}
                getMaxExportCount={async () => {
                  return JOB_PUBLIC_MAX_EXPORT_SIZE;
                }}
              />
              <DataBackupRestore
                title="公司评论"
                getExcelJsonArrayFunction={getCompanyCommentDataToExcelJsonArray}
                fileHeader={COMPANY_COMMENT_FILE_HEADER}
                saveDataFunction={saveCompanyCommentData}
                getDataTotalFunction={getCompanyCommentDataTotal}
                getMaxExportCount={async () => {
                  return COMPANY_COMMENT_MAX_EXPORT_SIZE;
                }}
              />
            </Card>
          </Flex>
        </Card>
      </Flex >
    </>
  );
};

export default DataManagementView;
