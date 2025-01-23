import { API_SERVER_GITHUB, EVENT_RESPONSE_INFO } from "@/common";
import Emitter from "@/common/extension/emitter";
import dayjs from "dayjs";
import React from "react";
import { HashRouter, Route, Routes } from "react-router";
import { useShallow } from 'zustand/shallow';
import "./App.css";
import RootLayout from "./layout/RootLayout";
import BbsView from "./pages/BbsView";
import DashboardView from "./pages/DashboardView";
import FileView from "./pages/FileView";
import SettingView from "./pages/SettingView";
import SystemView from "./pages/SystemView";
import AutomateView from "./pages/assistant/AutomateView";
import FavoriteJobView from "./pages/assistant/FavoriteJobView";
import HistoryJobView from "./pages/assistant/HistoryJobView";
import CompanyTagView from "./pages/data/CompanyTagView";
import CompanyView from "./pages/data/CompanyView";
import JobTagView from "./pages/data/JobTagView";
import JobView from "./pages/data/JobView";
import TagView from "./pages/data/TagView";
import PartnerView from "./pages/dataSharePlan/PartnerView";
import DataSharePlanStatisticView from "./pages/dataSharePlan/StatisticView";
import TaskView from "./pages/dataSharePlan/TaskView";
import DataSharePlanWelcomeView from "./pages/dataSharePlan/WelcomeView";
import useApiStore from "./store/ApiStore";
import useAuthStore from "./store/AuthStore";
import useDataSharePlanStore from "./store/DataSharePlanStore";
const App: React.FC = () => {

  const [init, setInit] = useState(false);

  const [authStoreInit] = useAuthStore(useShallow(((state) => [
    state.init,
  ])));
  const [dataSharePlanStoreInit] = useDataSharePlanStore(useShallow(((state) => [
    state.init,
  ])));
  const [updateApiInfo] = useApiStore(useShallow(((state) => [
    state.update,
  ])));

  useEffect(() => {
    const initStore = async () => {
      await authStoreInit();
      await dataSharePlanStoreInit();
      setInit(true);
      document.getElementById("loading")?.remove()
    }
    initStore();
  }, [])

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
  }, [])
  return (
    init ? <HashRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<DashboardView />} />
          <Route path="favoriteJob" element={<FavoriteJobView />} />
          <Route path="historyJob" element={<HistoryJobView />} />
          <Route path="automate" element={<AutomateView />} />
          <Route path="bbs" element={<BbsView />} />
          <Route path="job" element={<JobView />} />
          <Route path="company" element={<CompanyView />} />
          <Route path="tag" element={<TagView />} />
          <Route path="jobTag" element={<JobTagView />} />
          <Route path="companyTag" element={<CompanyTagView />} />
          <Route path="dataSharePlanWelcome" element={<DataSharePlanWelcomeView />} />
          <Route path="dataSharePlanStatistic" element={<DataSharePlanStatisticView />} />
          <Route path="task" element={<TaskView />} />
          <Route path="partner" element={<PartnerView />} />
          <Route path="file" element={<FileView />} />
          <Route path="system" element={<SystemView />} />
          <Route path="setting" element={<SettingView />} />
          <Route path="*" element={<DashboardView />} />
        </Route>
      </Routes>
    </HashRouter> : null
  );
};

export default App;
