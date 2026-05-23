import { Card, Col, Flex, Popover, Row, Typography } from 'antd';
const { Text, Link } = Typography;
import { logo } from '../assets';
import './NavigatorView.css';

const functionList = [
  {
    url: 'data/companyComment',
    label: '查询公司评论',
    icon: `i-mingcute:comment-line`,
    desc: `可根据公司名查询公司评论，数据来自数据源`,
  },
  {
    url: 'bbs',
    label: '讨论区',
    icon: `i-ri:kakao-talk-line`,
    desc: `登录Github帐号，写下你想说的`,
  },
  {
    url: 'assistant/favoriteJob',
    label: '职位偏好',
    icon: `i-f7:square-favorites-alt`,
    desc: `根据个人偏好，快速筛选扫描过的职位`,
  },
  {
    url: 'assistant/historyJob',
    label: '浏览历史',
    icon: `i-material-symbols:history`,
    desc: `显示最近浏览的职位`,
  },
  {
    url: 'task/taskStatistic',
    label: '任务统计',
    icon: `i-akar-icons:statistic-up`,
    desc: `查看系统后台任务运行状态`,
  },
  {
    url: 'dataSource/list',
    label: '数据源',
    icon: `i-material-symbols:dataset`,
    desc: `数据源管理，可追加自定义数据源，如公司评论，私有数据`,
  },
];

const publicJobWebsiteList = [
  {
    url: 'https://www.jobonline.cn/position',
    label: '就业在线',
    logo: logo.jobonline,
    desc: `
    “就业在线”平台是由人力资源社会保障部组织建设的国家级招聘求职服务平台。汇聚各地、各类人力资源服务机构的“旗舰店”，发挥公共就业人才服务机构和经营性人力资源服务机构的作用，实现招聘求职信息实时、全面汇聚、共享和发布，支持跨区域、跨层级开展招聘求职服务。
    `,
  },
  {
    url: 'https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/search?type=1',
    label: '广东公共求职招聘服务平台',
    logo: logo.ggfw_hrss_gd,
    desc: `面向求职者和用人单位的公共服务平台，为招聘单位提供发布岗位、搜索人才、面试管理等招聘人才的服务。求职者在求职招聘管理模块实现发布求职意向、查找岗位、简历管理等求职功能。开展招聘会、直播带岗等活动，细化求职招聘服务，为求职者和用人单位提供了高效、便捷、专业的求职招聘一体化服务`,
  },
];
const publicJobTrainList = [
  {
    url: 'https://jc.mohrss.gov.cn/',
    label: '就业创业和职业培训在线服务平台',
    logo: logo.jcmohrss,
    desc: `
    就业创业和职业培训在线服务平台（就创平台）是人力资源和社会保障部中国就业培训技术指导中心以提升就业创业技能为核心，汇集短缺职业、龙头企业等课程，融合“教、学、测、练、考、证、就”的数字化在线培训服务平台。
    `,
  },
  {
    url: 'https://xzy.mohrss.gov.cn/',
    label: '新职业在线学习平台',
    logo: logo.xzymohrss,
    desc: `
    `,
  },
];
const jobWebsiteList = [
  {
    url: 'https://www.zhipin.com/web/geek/jobs',
    label: 'BOSS直聘',
    logo: logo.boss,
    desc: ``,
  },
  {
    url: 'https://we.51job.com/pc/search ',
    label: '前程无忧',
    logo: logo.job51,
    desc: ``,
  },
  {
    url: 'https://sou.zhaopin.com/',
    label: '智联招聘',
    logo: logo.zhilian,
    desc: `智联招聘（北京网聘咨询有限公司）创建于1994年，是深受企业信赖的人才平台，更受职场人喜爱的职业发展平台，为个人用户的整个职业生涯提供相关职业发展机会，为企业提供一站式专业人力资源服务，包括网络招聘、校园招聘(机考)、海外招聘（线上海外）、智联卓聘（RPO、猎头、背调）、人力资源服务外包、教育培训、人才测评与咨询、职Q社区、雇主品牌、大数据报告（人才供需、行业薪酬）等，是人才生态的构建者，是拥有政府颁发的人力资源服务服务许可证和劳务派遣许可证的专业服务机构，在全国拥有39家分公司，南北两大互动营销中心，6000+员工，覆盖200多座城市。`,
  },
  {
    url: 'https://www.lagou.com/wn/zhaopin',
    label: '拉钩网',
    logo: logo.lagou,
    desc: `拉勾是互联网人的职业成长平台，专门为互联网人才提供求职机会、提高职业能力，同时为各行业培养和输送互联网人才。平台活跃着100w+家优秀企业，覆盖领域包括电子商务、游戏、O2O、大数据、云计算、社交网络、金融、快消、制造业、教育、旅游等全行业。`,
  },
  {
    url: 'https://www.liepin.com/zhaopin',
    label: '猎聘网',
    logo: logo.liepin,
    desc: `猎聘作为专业的招聘平台，始终以“让职场人更成功”为使命，为企业、人才和猎头提供精准高效的招聘求职服务。`,
  },
  {
    url: 'https://hk.jobsdb.com/',
    label: 'Jobsdb-HK',
    logo: logo.jobsdb,
    desc: ``,
  },
];

const companyWebsiteList = [
  { url: 'https://aiqicha.baidu.com/s', label: '爱企查', desc: `` },
  { url: 'https://beian.miit.gov.cn', label: '工信部', desc: `` },
  { url: 'https://www.creditchina.gov.cn', label: '信用中国', desc: `` },
  {
    url: 'https://www.gsxt.gov.cn/corp-query-homepage.html',
    label: '企业信用',
    desc: ``,
  },
  { url: 'http://zxgk.court.gov.cn/zhzxgk/', label: '执行信息', desc: `` },
  { url: 'https://wenshu.court.gov.cn', label: '裁判文书', desc: `` },
  { url: 'https://xwqy.gsxt.gov.cn', label: '个体私营', desc: `` },
];

import { useNavigate } from 'react-router';
import useAnalysisStore from '../store/AnalysisStore';
import useJobSnapshotStore from '../store/JobSnapshotStore';
import { useShallow } from 'zustand/shallow';
const NavigatorView: React.FC = () => {
  const [analysisConfig, updateAnalysis] = useAnalysisStore(
    useShallow((state) => [state.config, state.update])
  );
  const [analysisEnable, setAnalysisEnable] = useState(false);
  const [jobSnapshotEnable, setJobSnapshotEnable] = useState(false);
  const [jobSnapshotConfig] = useJobSnapshotStore(
    useShallow((state) => [state.config])
  );
  const navigate = useNavigate();
  const [advancedFunctionList, setAdvancedFunctionList] = useState([]);

  useEffect(() => {
    setAnalysisEnable(analysisConfig.enable);
    setJobSnapshotEnable(jobSnapshotConfig.enable);
  }, []);

  useEffect(() => {
    setAdvancedFunctionList([
      {
        url: analysisEnable
          ? 'assistant/analysisSetting'
          : 'assistant/analysisWelcome',
        label: '职位分析',
        icon: `i-eos-icons:ai`,
        desc: `使用大模型技术，根据预设的简历分析职位的匹配度`,
      },
      {
        url: jobSnapshotEnable
          ? 'assistant/jobSnapshotSetting'
          : 'data/jobSnapshot',
        label: '职位快照',
        icon: `i-qlementine-icons:snapshot-16`,
        desc: `持久化职位详情页`,
      },
      {
        url: 'system/dataManagement',
        label: '数据管理',
        icon: `i-streamline:database-setting`,
        desc: `可对数据进行导入，导出操作`,
      },
      {
        url: 'system/setting',
        label: '系统设置',
        icon: `i-uil:setting`,
        desc: `可开启数据云备份和其他高级功能`,
      },
    ]);
  }, [analysisEnable]);
  return (
    <>
      <Row gutter={2}>
        <Col sm={24} xl={24}>
          <Card size="small" title="常用功能" style={{ margin: 10 }}>
            <Row>
              {functionList.map((item, index) => (
                <Col
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Popover content={<Text>{item.desc}</Text>} trigger="hover">
                    <Link
                      onClick={() => {
                        navigate(item.url);
                      }}
                      className="flexCenter"
                    >
                      <Row>
                        <Col xs={24} className="flexCenter">
                          <div className={`${item.icon} functionIcon`}></div>
                        </Col>
                        <Col xs={24} className="cardLabel flexCenter">
                          <Flex>{item.label}</Flex>
                        </Col>
                      </Row>
                    </Link>
                  </Popover>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={24}>
          <Card size="small" title="高级功能" style={{ margin: 10 }}>
            <Row>
              {advancedFunctionList.map((item, index) => (
                <Col
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Popover content={<Text>{item.desc}</Text>} trigger="hover">
                    <Link
                      onClick={() => {
                        navigate(item.url);
                      }}
                      className="flexCenter"
                    >
                      <Row>
                        <Col xs={24} className="flexCenter">
                          <div className={`${item.icon} functionIcon`}></div>
                        </Col>
                        <Col xs={24} className="cardLabel flexCenter">
                          <Flex>{item.label}</Flex>
                        </Col>
                      </Row>
                    </Link>
                  </Popover>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={12}>
          <Card size="small" title="商业化招聘网站" style={{ margin: 10 }}>
            <Row>
              {jobWebsiteList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <img
                          className="companyLogo"
                          src={item.logo}
                          alt="logo"
                        />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={12}>
          <Card size="small" title="公司查询" style={{ margin: 10 }}>
            <Row>
              {companyWebsiteList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={3}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <div className="i-mdi-web w-10 h-10" />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={24}>
          <Card size="small" title="公共招聘网站" style={{ margin: 10 }}>
            <Row>
              {publicJobWebsiteList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <img
                          className="companyLogo"
                          src={item.logo}
                          alt="logo"
                        />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={24}>
          <Card size="small" title="公共职业培训网站" style={{ margin: 10 }}>
            <Row>
              {publicJobTrainList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <img
                          className="companyLogo"
                          src={item.logo}
                          alt="logo"
                        />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default NavigatorView;
