import { Icon } from "@iconify/react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadFull } from "tsparticles";
import { Option } from "../../components/data/tsparticlesOption";
import styles from "./WelcomeView.module.css";
import useDataSharePlanStore from "../../store/DataSharePlanStore";
import { useShallow } from "zustand/shallow";
import { useNavigate } from "react-router";
const thirdPageOption = Option.pop2Style;

const WelcomeView: React.FC = () => {

    const [init, setInit] = useState(false);
    const [change] = useDataSharePlanStore(useShallow(((state) => [
        state.change
    ])));
    const navigate = useNavigate();

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadFull(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const enable = async () => {
        await change(true);
        navigate(`/dataSharePlanStatistic`);
    }

    return <>
        <div className={styles.main}>
            <Particles
                id="tsparticles"
                options={thirdPageOption}
                className={styles.wrapper}
            />
            <div className={styles.descWrapper}>
                <div className={styles.desc}>开启数据共享计划，掌握更加全面的职位信息。</div>

                <div className={styles.title}>
                    <Icon icon="material-symbols:follow-the-signs-sharp" />可协助你
                </div>
                <div className={styles.item}>
                    <Icon icon="material-symbols:counter-1" /> 自动创建数据共享仓库。
                </div>
                <div className={styles.item}>
                    <Icon icon="material-symbols:counter-2" /> 定时上传职位，公司，公司标签数据。
                </div>
                <div className={styles.item}>
                    <Icon icon="material-symbols:counter-3" /> 定时获取来自小伙伴的共享数据。
                </div>
                <div className={styles.enable}>
                    <button onClick={enable}>
                        <div className={styles.title}>现在开启
                            <Icon icon="material-symbols:electrical-services" />
                        </div><span></span>
                    </button>
                </div>
            </div>
        </div>
    </>
}

export default WelcomeView;