import { Modal } from 'antd';
import { CompanyData } from '../data/CompanyData';
import { JobData } from '../data/JobData';
import CompanyItemTable from './CompanyItemTable';
import JobItemTable from './JobItemTable';

interface JobModelProps {
  data: JobData;
  refresh?: boolean;
}

const JobModel: React.FC<JobModelProps> = ({ data, refresh }) => {
  const [companyModalData, setCompanyModalData] = useState<CompanyData>();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(true);

  useEffect(() => {
    setIsJobModalOpen(true);
  }, [refresh]);

  const handleJobModalCancel = () => {
    setIsJobModalOpen(false);
  };

  const handleCompanyModalCancel = () => {
    setIsCompanyModalOpen(false);
    setCompanyModalData(null);
  };

  const onCompanyClickHandle = (data: CompanyData) => {
    setCompanyModalData(data);
    setIsCompanyModalOpen(true);
  };

  return data ? (
    <>
      <Modal
        open={isJobModalOpen && data != null}
        onCancel={handleJobModalCancel}
        footer={null}
        width="80%"
      >
        <JobItemTable
          data={data}
          onCompanyClick={onCompanyClickHandle}
        ></JobItemTable>
      </Modal>
      <Modal
        open={isCompanyModalOpen}
        onCancel={handleCompanyModalCancel}
        footer={null}
        width="80%"
      >
        <CompanyItemTable data={companyModalData}></CompanyItemTable>
      </Modal>
    </>
  ) : null;
};

export default JobModel;
