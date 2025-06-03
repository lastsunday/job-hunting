import { Flex, Tabs } from 'antd';
import './DashboardView.css';

import NavigatorView from '../dashboard/NavigatorView';
import StatisticView from '../dashboard/StatisticView';
import TodayView from '../dashboard/TodayView';

const DashboardView: React.FC = () => {

  const tabContentMap = new Map();
  tabContentMap.set("navigator", <NavigatorView />);
  tabContentMap.set("statistic", <StatisticView />);

  const [tabContent, setTabContent] = useState(tabContentMap.get('navigator'));
  const onTabChange = (key: string) => {
    setTabContent(tabContentMap.get(key));
  };

  return (
    <>
      <TodayView></TodayView>
      <Flex vertical>
        <Tabs defaultActiveKey="navigator" items={
          [
            {
              key: "navigator",
              label: "快捷导航",
            },

            {
              key: "statistic",
              label: "统计",
            }
          ]} onChange={onTabChange} />
        {tabContent}
      </Flex>
    </>
  );
};

export default DashboardView;
