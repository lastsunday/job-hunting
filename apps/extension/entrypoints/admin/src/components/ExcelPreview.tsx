import { Table } from 'antd';
import { useState } from 'react';
import { read, utils } from 'xlsx';
import { dateToStr } from '@/common/utils';

export type ExcelPreviewProps = {
  source: ArrayBuffer;
};
const ExcelPreview: React.FC<ExcelPreviewProps> = ({ source }) => {
  const [columns, setColumns] = useState([]);
  const [dataSource, setDataSource] = useState([]);

  /* Fetch and update the state once */
  useEffect(() => {
    (async () => {
      const wb = read(source, { cellDates: true }); // parse the array buffer
      const headerArray = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
      });
      if (headerArray.length > 0) {
        const headers = [];
        const headerRowArray = headerArray[0] as [];
        headerRowArray.forEach((item) => {
          headers.push({
            title: item,
            dataIndex: item,
            key: item,
            width: 100,
            ellipsis: true,
            textWrap: 'word-break',
            render: (value, record, index) => {
              if (value instanceof Date) {
                return `${dateToStr(value)}`;
              } else {
                return `${value ? value : ''}`;
              }
            },
          });
        });
        setColumns(headers);
        const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
          header: 2,
          UTC: true,
        });
        setDataSource(data); // update state
      } else {
        setColumns([]);
        setDataSource([]); // update state
      }
    })();
  }, []);

  return (
    <>
      <Table
        scroll={{ x: '100%' }}
        sticky={{ offsetHeader: 64 }}
        size="small"
        dataSource={dataSource}
        columns={columns}
      />
    </>
  );
};

export default ExcelPreview;
