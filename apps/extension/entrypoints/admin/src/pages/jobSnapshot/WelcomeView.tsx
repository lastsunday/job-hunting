import styles from './WelcomeView.module.css';
import useJobSnapshotStore from '../../store/JobSnapshotStore';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router';

const WelcomeView: React.FC = () => {
  const [config, update] = useJobSnapshotStore(
    useShallow((state) => [state.config, state.update]),
  );
  const navigate = useNavigate();

  const enable = async () => {
    config.enable = true;
    await update(config);
    navigate(`/data/jobSnapshot`);
  };

  return (
    <>
      <div className={styles.main}>
        <div className={styles.wrapper}>
          <div className={styles.descWrapper}>
            <div className={styles.desc}>
              开启职位快照，拥有职位信息时光机。
            </div>
            <div className={styles.title}>
              <div className="i-mdi:think-outline" />
              可协助你
            </div>
            <div className={styles.item}>
              <div className="i-material-symbols:counter-1 inline-flex" />{' '}
              离线浏览职位信息。
            </div>
            <div className={styles.item}>
              <div className="i-material-symbols:counter-2 inline-flex" />{' '}
              穿梭于不同时刻的职位信息。
            </div>
            <div className={styles.enable}>
              <button onClick={enable}>
                <div className={styles.title}>
                  现在开启
                  <div className="i-material-symbols:electrical-services" />
                </div>
                <span></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeView;
