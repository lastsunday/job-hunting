import { API_SERVER_GITHUB, EVENT_RESPONSE_INFO } from '@/common';
import Emitter from '@/common/extension/emitter';
import dayjs from 'dayjs';
import React from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { useShallow } from 'zustand/shallow';
import './App.css';
import RootLayout from './layout/RootLayout';
import BbsView from './pages/BbsView';
import DashboardView from './pages/DashboardView';
import FileView from './pages/FileView';
import SettingView from './pages/SettingView';
import DatabaseView from './pages/DatabaseView';
import AutomateView from './pages/assistant/AutomateView';
import FavoriteJobView from './pages/assistant/FavoriteJobView';
import HistoryJobView from './pages/assistant/HistoryJobView';
import CompanyTagView from './pages/data/CompanyTagView';
import CompanyView from './pages/data/CompanyView';
import JobTagView from './pages/data/JobTagView';
import JobView from './pages/data/JobView';
import TagView from './pages/data/TagView';
import DataSourceView from './pages/dataSharePlan/DataSourceView';
import TaskStatisticView from './pages/dataSharePlan/StatisticView';
import TaskDetailView from './pages/dataSharePlan/TaskDetailView';
import DataSharePlanWelcomeView from './pages/dataSharePlan/WelcomeView';
import AnalysisWelcomeView from './pages/analysis/WelcomeView';
import AnalysisSettingView from './pages/analysis/SettingView';
import useApiStore from './store/ApiStore';
import useAuthStore from './store/AuthStore';
import useDataSharePlanStore from './store/DataSharePlanStore';
import useAnalysisStore from './store/AnalysisStore';
import JobSnapshotView from './pages/data/JobSnapshotView';
import JobSnapshotWelcomeView from './pages/jobSnapshot/WelcomeView';
import useJobSnapshotStore from './store/JobSnapshotStore';
import JobPublicView from './pages/data/JobPublicView';
import DataManagementView from './pages/DataManagementView';
import CompanyCommentView from './pages/data/CompanyCommentView';
import DataSourceMetadataView from './pages/dataSharePlan/DataSourceMetadataView';
const App: React.FC = () => {
  const [init, setInit] = useState(false);

  const [authStoreInit] = useAuthStore(useShallow((state) => [state.init]));
  const [dataSharePlanStoreInit] = useDataSharePlanStore(
    useShallow((state) => [state.init])
  );
  const [analysisStoreInit] = useAnalysisStore(
    useShallow((state) => [state.init])
  );
  const [updateApiInfo] = useApiStore(useShallow((state) => [state.update]));
  const [jobSnapshotStoreInit] = useJobSnapshotStore(
    useShallow((state) => [state.init])
  );
  useEffect(() => {
    const initStore = async () => {
      await authStoreInit();
      await dataSharePlanStoreInit();
      await analysisStoreInit();
      await jobSnapshotStoreInit();
      setInit(true);
      document.getElementById('loading')?.remove();
    };
    initStore();
  }, []);

  useEffect(() => {
    const initListener = async () => {
      Emitter.on(`${EVENT_RESPONSE_INFO}${API_SERVER_GITHUB}`, (value) => {
        updateApiInfo(value['x-ratelimit-resource'], {
          rateLimitLimit: value['x-ratelimit-limit'],
          rateLimitRemaining: value['x-ratelimit-remaining'],
          rateLimitReset: dayjs.unix(value['x-ratelimit-reset']).toDate(),
          rateLimitUsed: value['x-ratelimit-used'],
        });
      });
    };
    initListener();
  }, []);
  return init ? (
    <HashRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<DashboardView />} />
          <Route path="assistant/favoriteJob" element={<FavoriteJobView />} />
          <Route path="assistant/historyJob" element={<HistoryJobView />} />
          <Route path="assistant/automate" element={<AutomateView />} />
          <Route path="assistant/analysisWelcome" element={<AnalysisWelcomeView />} />
          <Route path="assistant/analysisSetting" element={<AnalysisSettingView />} />
          <Route
            path="assistant/jobSnapshotSetting"
            element={<JobSnapshotWelcomeView />}
          />
          <Route path="assistant/jobSnapshot" element={<JobSnapshotView />} />
          <Route path="bbs" element={<BbsView />} />
          <Route path="data/job" element={<JobView />} />
          <Route path="data/jobSnapshot" element={<JobSnapshotView />} />
          <Route path="data/company" element={<CompanyView />} />
          <Route path="data/tag" element={<TagView />} />
          <Route path="data/jobTag" element={<JobTagView />} />
          <Route path="data/companyTag" element={<CompanyTagView />} />
          <Route path="data/jobPublic" element={<JobPublicView />} />
          <Route path="data/companyComment" element={<CompanyCommentView />} />
          <Route
            path="dataSharePlan/dataSharePlanWelcome"
            element={<DataSharePlanWelcomeView />}
          />
          <Route
            path="task/taskStatistic"
            element={<TaskStatisticView />}
          />
          <Route path="task/taskDetail" element={<TaskDetailView />} />
          <Route path="dataSource/list" element={<DataSourceView />} />
          <Route path="dataSource/metadata" element={<DataSourceMetadataView />} />
          <Route path="system/file" element={<FileView />} />
          <Route path="system/database" element={<DatabaseView />} />
          <Route path="system/setting" element={<SettingView />} />
          <Route path="system/dataManagement" element={<DataManagementView />} />
          <Route path="*" element={<DashboardView />} />
        </Route>
      </Routes>
    </HashRouter>
  ) : null;
};

export default App;
