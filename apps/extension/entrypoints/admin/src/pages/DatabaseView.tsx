import { FileApi } from '@/common/api';
import {
  dbExec,
  dbGetAllTableName,
  dbSchemaVersion,
  dbSize,
} from '@/common/api/common';
import { FileStatisticDTO } from '@/common/data/dto/fileStatisticDTO';
import { errorLog } from '@/common/log';
import { convertToAbbreviation, isBlank } from '@/common/utils';
import {
  Alert,
  Button,
  Card,
  Flex,
  Popover,
  Row,
  Select,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import StatisticCard from '../components/StatisticCard';
import styles from './DatabaseView.module.css';
import React from 'react';
const { Text } = Typography;
dayjs.extend(duration);
import CodeMirror, { keymap } from '@uiw/react-codemirror';
import { sql as langSql, PostgreSQL } from '@codemirror/lang-sql';
import { historyField } from '@codemirror/commands';
const stateFields = { history: historyField };
import {
  STORAGE_KEY_SQL_EDITOR_STATE,
  STORAGE_KEY_SQL_EDITOR_VALUE,
} from '@/common/config';

const DatabaseView: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [databaseSize, setDatabaseSize] = useState();
  const [schemaVersion, setSchemaVersion] = useState();
  const [fileStatistic, setFileStatistic] = useState<FileStatisticDTO>({});
  const [isDebugDatabaseMenuOpen, setIsDebugDatabaseMenuOpen] = useState(false);
  const [columns, setColumns] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [sql, setSql] = useState<string>();
  const [execSqlLoading, setExecSqlLoading] = useState(false);
  const [sqlExecError, setSqlExecError] = useState<string>();
  const [tables, setTables] = useState<{ name: string }[]>([]);
  const [sqlCostTime, setSqlCostTime] = useState<number>();
  const [affectedRows, setAffectedRows] = useState<number>();
  const tempSql = useRef('');
  const serializedState = localStorage.getItem(STORAGE_KEY_SQL_EDITOR_STATE);

  useEffect(() => {
    const query = async () => {
      const databaseSize = (await dbSize()).total;
      setDatabaseSize(databaseSize);
      const schemaVersion = (await dbSchemaVersion()).version;
      setSchemaVersion(schemaVersion);
      const fileStatistic = await FileApi.fileStatistic();
      setFileStatistic(fileStatistic);
      const allTables = (await dbGetAllTableName()).result;
      setTables(allTables);
      tempSql.current =
        localStorage.getItem(STORAGE_KEY_SQL_EDITOR_VALUE) || '';
      setSql(tempSql.current);
    };

    query();
  }, []);

  const getUnit = (num) => {
    let unit = '';
    if (num < 1024) {
      unit = '';
    } else if (num < 1024 * 1024) {
      unit = 'K';
    } else if (num < 1024 * 1024 * 1024) {
      unit = 'M';
    } else if (num < 1024 * 1024 * 1024 * 1024) {
      unit = 'G';
    } else {
      unit = 'T';
    }
    return `${unit}B`;
  };

  const getNum = (num) => {
    if (num < 1024) {
      return num;
    } else if (num < 1024 * 1024) {
      return num / 1024;
    } else if (num < 1024 * 1024 * 1024) {
      return num / (1024 * 1024);
    } else if (num < 1024 * 1024 * 1024 * 1024) {
      return num / (1024 * 1024 * 1024);
    } else {
      return num / (1024 * 1024 * 1024 * 1024);
    }
  };

  const getSwitchStyle = () => {
    if (isDebugDatabaseMenuOpen) {
      return { backgroundColor: 'red' };
    } else {
      return null;
    }
  };

  const execSql = async (sql) => {
    if (!sql) {
      setSqlExecError('');
      setColumns(null);
      setDataSource(null);
      return;
    }
    setDataSource(null);
    setExecSqlLoading(true);
    setSqlExecError(null);
    try {
      const beginExecSqlTime = dayjs();
      const { rows, fields, affectedRows } = (await dbExec({ sql })).result;
      const afterExecSqlTime = dayjs();
      setSqlCostTime(afterExecSqlTime.diff(beginExecSqlTime));
      const headers = [];
      const fieldNames = fields.map((item) => item.name);
      headers.push({
        title: '#',
        dataIndex: '$index',
        key: '$index',
        ellipsis: false,
        width: 60,
      });
      for (let n = 0; n < fieldNames.length; n++) {
        const key = fieldNames[n];
        headers.push({
          title: key,
          dataIndex: key,
          key: key,
          width: 200,
          sorter: true,
          render: (value, record, index) => {
            return (
              <Popover
                key={index}
                content={<Text copyable>{typeof value == 'object' ? JSON.stringify(value) : value}</Text>}
                trigger="click"
              >
                <Text
                  key={index}
                  title={`${typeof value == 'object' ? JSON.stringify(value) : value}`}
                  ellipsis
                >{`${typeof value == 'object' ? JSON.stringify(value) : value}`}</Text>
              </Popover>
            );
          },
        });
      }
      setColumns(headers);
      rows.forEach((item, index) => {
        item.$index = index + 1;
      });
      setDataSource(rows);
      setAffectedRows(affectedRows);
      setSqlExecError('');
    } catch (e) {
      errorLog(e);
      setSqlExecError(e.message);
      setAffectedRows(null);
    } finally {
      setExecSqlLoading(false);
    }
  };

  const onSqlChange = (value, viewUpdate) => {
    localStorage.setItem(STORAGE_KEY_SQL_EDITOR_VALUE, value);
    const state = viewUpdate.state.toJSON(stateFields);
    localStorage.setItem(STORAGE_KEY_SQL_EDITOR_STATE, JSON.stringify(state));
  };

  return (
    <>
      {contextHolder}
      <Flex vertical gap={5}>
        <Card
          title={
            <Flex align="center" gap={5}>
              <Text>数据库</Text>
              <Switch
                style={getSwitchStyle()}
                checkedChildren="数据库调试开启"
                unCheckedChildren="数据库调试关闭"
                size="small"
                checked={isDebugDatabaseMenuOpen}
                onChange={(checked) => {
                  setIsDebugDatabaseMenuOpen(checked);
                }}
              ></Switch>
            </Flex>
          }
          bordered={false}
          size="small"
        >
          <Row gutter={2}>
            <StatisticCard
              name={
                <Flex className={styles.title}>
                  <div className="i-material-symbols:database" />
                  <Text>数据库大小</Text>
                </Flex>
              }
              count={
                databaseSize != null ? getNum(databaseSize).toFixed(2) : 'N/A'
              }
              unit={databaseSize != null ? getUnit(databaseSize) : ''}
            ></StatisticCard>
            <StatisticCard
              name={
                <Flex className={styles.title}>
                  <div className="i-material-symbols:database" />
                  <Text>数据库版本</Text>
                </Flex>
              }
              count={schemaVersion != null ? `V${schemaVersion}` : 'N/A'}
              unit={''}
            ></StatisticCard>
            <StatisticCard
              name={
                <Flex className={styles.title}>
                  <div className="i-material-symbols:table" />
                  <Text>数据库表数量</Text>
                </Flex>
              }
              count={tables != null ? `${tables.length}` : 'N/A'}
              unit={'张'}
            ></StatisticCard>
          </Row>
        </Card>
        <Card title="历史文件信息" bordered={false} size="small">
          <Row gutter={2}>
            <StatisticCard
              name={
                <Flex className={styles.title}>
                  <div className="i-mdi:file" />
                  <Text>历史文件大小</Text>
                </Flex>
              }
              count={
                fileStatistic.mergeNotDeleteFileSizeTotal != null
                  ? getNum(fileStatistic.mergeNotDeleteFileSizeTotal).toFixed(2)
                  : 'N/A'
              }
              unit={
                fileStatistic.mergeNotDeleteFileSizeTotal != null
                  ? getUnit(fileStatistic.mergeNotDeleteFileSizeTotal)
                  : ''
              }
              totalCount={
                fileStatistic.mergeFileSizeTotal != null
                  ? getNum(fileStatistic.mergeFileSizeTotal).toFixed(2)
                  : 'N/A'
              }
              totalCountUnit={
                fileStatistic.mergeFileSizeTotal != null
                  ? getUnit(fileStatistic.mergeFileSizeTotal)
                  : ''
              }
            ></StatisticCard>
            <StatisticCard
              name={
                <Flex className={styles.title}>
                  <div className="i-mdi:file" />
                  <Text>历史文件个数</Text>
                </Flex>
              }
              count={
                fileStatistic.mergeNotDeleteFileCount != null
                  ? convertToAbbreviation(fileStatistic.mergeNotDeleteFileCount)
                  : 'N/A'
              }
              unit={`个`}
              totalCount={
                fileStatistic.mergeFileCount != null
                  ? convertToAbbreviation(fileStatistic.mergeFileCount)
                  : 'N/A'
              }
              totalCountUnit={`个`}
            ></StatisticCard>
          </Row>
        </Card>
        {isDebugDatabaseMenuOpen ? (
          <Card title="数据库调试" bordered={false} size="small">
            <Flex vertical gap={5}>
              <Flex justify="end" gap={5}>
                <Flex style={{ width: 200 }}>
                  <Select
                    showSearch
                    disabled={execSqlLoading}
                    style={{ width: '100%' }}
                    allowClear
                    onSelect={(value) => {
                      if (value) {
                        const sql = `SELECT * FROM ${value} LIMIT 10 OFFSET 0`;
                        tempSql.current = sql;
                        setSql(tempSql.current);
                        execSql(tempSql.current);
                      }
                    }}
                    placeholder="选择表名快速查询"
                    options={tables}
                    fieldNames={{ label: 'name', value: 'name' }}
                    labelRender={({ label }) => (
                      <Flex align="center" gap={5}>
                        <div className="i-material-symbols:table" />
                        <Text>{label}</Text>
                      </Flex>
                    )}
                    optionRender={(option) => (
                      <Flex align="center" gap={5}>
                        <div className="i-material-symbols:table" />
                        <Text>{option.data.name}</Text>
                      </Flex>
                    )}
                  />
                </Flex>
                <Button
                  type="primary"
                  loading={execSqlLoading}
                  onClick={() => {
                    execSql(tempSql.current);
                  }}
                  title="Alt+Enter"
                >
                  <div className="i-mdi:play" />
                  执行
                </Button>
              </Flex>
              <Flex>
                <CodeMirror
                  basicSetup={{ autocompletion: true }}
                  extensions={[
                    langSql({
                      dialect: PostgreSQL,
                      upperCaseKeywords: true,
                      schema: tables.map((item) => {
                        return { label: item.name, type: 'namespace' };
                      }),
                    }),
                    keymap.of([
                      {
                        key: 'Alt-Enter',
                        run() {
                          execSql(tempSql.current);
                          return true;
                        },
                      },
                    ]),
                  ]}
                  style={{ width: '100%' }}
                  value={sql}
                  height="200px"
                  initialState={
                    serializedState
                      ? {
                        json: JSON.parse(serializedState || ''),
                        fields: stateFields,
                      }
                      : undefined
                  }
                  onChange={onSqlChange}
                  onUpdate={(viewUpdate) => {
                    const { selectionSet } = viewUpdate;
                    const { doc, selection } = viewUpdate.state;
                    const { from, to } = selection.ranges[0];
                    const allText = doc.text.join(' ');
                    if (selectionSet) {
                      const result = allText.slice(from, to);
                      if (isBlank(result)) {
                        tempSql.current = allText;
                      } else {
                        tempSql.current = result;
                      }
                    }
                  }}
                />
              </Flex>
              {sqlExecError != null ? (
                sqlExecError == '' ? (
                  <Alert
                    message={`执行成功,耗时${sqlCostTime}ms${affectedRows != null
                      ? ',影响' + affectedRows + '条数据'
                      : ''
                      }`}
                    type="success"
                    showIcon
                    closable
                  />
                ) : (
                  <Alert
                    message="执行异常"
                    description={sqlExecError}
                    type="error"
                    showIcon
                  />
                )
              ) : null}
              <Flex>
                <Table
                  loading={execSqlLoading}
                  pagination={{
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} 共 ${total} 条记录`,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 50, 100, 200, 500, 1000],
                  }}
                  scroll={{ x: '100%' }}
                  sticky={{ offsetHeader: 64 }}
                  size="small"
                  dataSource={dataSource}
                  columns={columns}
                />
              </Flex>
            </Flex>
          </Card>
        ) : null}
      </Flex>
    </>
  );
};

export default DatabaseView;
