import { Card, Col, Flex, Row } from 'antd';
import { logo } from '../assets';
import Link from 'antd/lib/typography/Link';
import "./NavigatorView.css";

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

const NavigatorView: React.FC = () => {

  return (
    <>
      <Row gutter={2}>
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
      </Row>
    </>
  );
};

export default NavigatorView;
