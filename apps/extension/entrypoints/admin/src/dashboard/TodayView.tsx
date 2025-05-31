import { CompanyApi, JobApi } from '@/common/api';
import { Row } from 'antd';
import StatisticCard from '../components/StatisticCard';

const TodayView: React.FC = () => {
  const [todayStatisticData, setTodayStatisticData] = useState([]);

  useEffect(
    () => {
      const statistic = async () => {
        const statisticJobBrowse = await JobApi.statisticJobBrowse();
        const statisticCompany = await CompanyApi.statisticCompany();
        const statisticCompanyTag = await CompanyApi.statisticCompanyTag();
        const todayResult = [];
        todayResult.push({
          name: '今天查看职位',
          count: statisticJobBrowse.todayBrowseDetailCount,
          previousCount: statisticJobBrowse.yesterdayBrowseDetailCount,
          totalCount: statisticJobBrowse.totalBrowseDetailCount,
          unit: '个',
        });
        todayResult.push({
          name: '今天职位新增',
          count: statisticJobBrowse.todayJob,
          previousCount: statisticJobBrowse.yesterdayJob,
          totalCount: statisticJobBrowse.totalJob,
          unit: '个',
        });
        todayResult.push({
          name: '今天扫描职位',
          count: statisticJobBrowse.todayBrowseCount,
          previousCount: statisticJobBrowse.yesterdayBrowseCount,
          totalCount: statisticJobBrowse.totalBrowseCount,
          unit: '次',
        });
        todayResult.push({
          name: '今天公司新增',
          count: statisticCompany.todayAddCount,
          previousCount: statisticCompany.yesterdayAddCount,
          totalCount: statisticCompany.totalCompany,
          unit: '间',
        });
        todayResult.push({
          name: '今天标签公司新增',
          count: statisticCompanyTag.todayTagCompany,
          previousCount: statisticCompanyTag.yesterdayTagCompany,
          totalCount: statisticCompanyTag.totalTagCompany,
          unit: '间',
        });
        todayResult.push({
          name: '今天标签新增',
          count: statisticCompanyTag.todayTag,
          previousCount: statisticCompanyTag.yesterdayTag,
          totalCount: statisticCompanyTag.totalTag,
          unit: '个',
        });
        setTodayStatisticData(todayResult);
      };
      statistic();
      return () => { };
    },
    [
      //这里的值改变时，会执行上面return的匿名函数
    ]
  );

  return (
    <>
      <Row gutter={2}>
        {todayStatisticData.map((item, index) => (
          <StatisticCard
            key={index}
            name={item.name}
            count={item.count}
            previousCount={item.previousCount}
            totalCount={item.totalCount}
            unit={item.unit}
          ></StatisticCard>
        ))}
      </Row>
    </>
  );
};

export default TodayView;
