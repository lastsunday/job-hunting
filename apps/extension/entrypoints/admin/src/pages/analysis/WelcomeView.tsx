import { Icon } from '@iconify/react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadFull } from 'tsparticles';
import { Option } from '../../components/data/tsparticlesOption';
import styles from './WelcomeView.module.css';
import useAnalysisStore from '../../store/AnalysisStore';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router';

const WelcomeView: React.FC = () => {
  const [init, setInit] = useState(false);
  const [config, update] = useAnalysisStore(
    useShallow((state) => [state.config, state.update])
  );
  const navigate = useNavigate();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadFull(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const enable = async () => {
    config.enable = true;
    await update(config);
    navigate(`/analysisSetting`);
  };

  return (
    <>
      <div className={styles.main}>
        <Particles
          id="tsparticles"
          options={Option.tunnelStyle}
          className={styles.wrapper}
        />
        <div className={styles.descWrapper}>
          <div className={styles.desc}>开启职位分析，掌握职位匹配信息。</div>

          <div className={styles.title}>
            <Icon icon="mdi:think-outline" />
            可协助你
          </div>
          <div className={styles.item}>
            <Icon icon="material-symbols:counter-1" />{' '}
            展示一目了然的职位匹配度。
          </div>
          <div className={styles.item}>
            <Icon icon="material-symbols:counter-2" /> 职位匹配详情一览无余。
          </div>
          <div className={styles.enable}>
            <button onClick={enable}>
              <div className={styles.title}>
                现在开启
                <Icon icon="material-symbols:electrical-services" />
              </div>
              <span></span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeView;
