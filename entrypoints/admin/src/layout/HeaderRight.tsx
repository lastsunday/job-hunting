import { ShareAltOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Flex, message, Modal, Popconfirm, Progress, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import styles from "./HeaderRight.module.css";
const { Text } = Typography;

import { convertToAbbreviation, dateToStr } from "@/common/utils";
import { Icon } from '@iconify/react';
import Link from 'antd/es/typography/Link';
import Markdown from 'marked-react';
import { useShallow } from 'zustand/shallow';
import useApiStore from "../store/ApiStore";
import useAuthStore from "../store/AuthStore";
import useDataSharePlanStore from '../store/DataSharePlanStore';
import useSystemStore from '../store/SystemStore';
const HeaderRight: React.FC = () => {

    const [auth, login, logout, username, avatar] = useAuthStore(useShallow(((state) => [
        state.auth,
        state.login,
        state.logout,
        state.username,
        state.avatar,
    ])));

    const [enable] = useDataSharePlanStore(useShallow(((state) => [
        state.enable,
    ])));

    const [core, graphql] = useApiStore(useShallow(((state) => [
        state.core,
        state.graphql,
    ])));

    const [versionObject,
        newVersion,
        latestVersion,
        latestVersionCreatedAt,
        latestChangelogContent,
        query,
        downloadLatest] = useSystemStore(useShallow((state => [
            state.versionObject,
            state.newVersion,
            state.latestVersion,
            state.latestVersionCreatedAt,
            state.latestChangelogContent,
            state.query,
            state.downloadLatest,
        ])));

    const [dataSharePartnerCount,
        uploadRecordTotalCountToday,
        downloadFileTotalCountToday,
        mergeRecordTotalCountToday,
        uploadRecordTotalCountAll,
        downloadFileTotalCountAll,
        mergeRecordTotalCountAll,] = useDataSharePlanStore(useShallow((state => [
            state.dataSharePartnerCount,
            state.uploadRecordTotalCountToday,
            state.downloadFileTotalCountToday,
            state.mergeRecordTotalCountToday,
            state.uploadRecordTotalCountAll,
            state.downloadFileTotalCountAll,
            state.mergeRecordTotalCountAll,
        ])));

    const [isLatestChangelogContentModalOpen, setIsLatestChangelogContentModalOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        query();
    }, [])

    const genApiProgress = () => {
        let result = [];
        [{ title: "Core", value: core }, { title: "Graphql", value: graphql }].map(obj => {
            const item = obj.value;
            const title = obj.title;
            result.push(
                <Flex align="center" key={obj.title}>
                    <Progress size={[170, 20]} percent={item.rateLimitRemaining / item.rateLimitLimit * 100} showInfo={true} percentPosition={{ align: 'center', type: 'inner' }} format={(percent) => {
                        return <Text title={`将于${dateToStr(item.rateLimitReset,"YYYY-MM-DD") ?? "N/A"}重置`} className={styles.progressText}><Icon icon="mdi:github" />{title} API:{item.rateLimitRemaining}/{item.rateLimitLimit}</Text>
                    }} />
                </Flex>
            );
        })
        return result;
    }

    return (
        <Flex gap="small" align="center" className={styles.root}>
            {contextHolder}
            <Flex gap={5} vertical>
                <Flex justify="end">
                    {newVersion ? <Tag style={{ cursor: "pointer" }} onClick={() => {
                        setIsLatestChangelogContentModalOpen(true);
                    }} color="yellow"><Flex align="center"><Icon icon="mdi:arrow-up-bold-box"></Icon>发现新版本</Flex></Tag> : null}
                    {auth ?
                        genApiProgress()
                        : null}
                </Flex>
                <Flex justify="end">
                    {
                        enable ?
                            <Flex gap={5}>
                                <Tooltip color="green" title="数据共享计划：开启"><ShareAltOutlined style={{ color: "green", fontSize: "18px" }} /></Tooltip>
                                <Flex gap={5}>
                                    <Tooltip title="上传记录数[今天/总计]">
                                        <Tag className={styles.tag} ><Icon icon="material-symbols:cloud-upload" /> {
                                            convertToAbbreviation(uploadRecordTotalCountToday) ?? '-'}/{
                                                convertToAbbreviation(uploadRecordTotalCountAll) ?? '-'}
                                        </Tag>
                                    </Tooltip>
                                    <Tooltip title="下载文件数[今天/总计)]">
                                        <Tag className={styles.tag}>
                                            <Icon icon="material-symbols:cloud-download" />{
                                                convertToAbbreviation(downloadFileTotalCountToday) ?? '-'}/{
                                                convertToAbbreviation(downloadFileTotalCountAll) ?? '-'}
                                        </Tag>
                                    </Tooltip>
                                    <Tooltip title="合并记录数[今天/总计]">
                                        <Tag className={styles.tag}>
                                            <Icon icon="material-symbols:merge" />{
                                                convertToAbbreviation(mergeRecordTotalCountToday) ?? '-'}/{
                                                convertToAbbreviation(mergeRecordTotalCountAll) ?? '-'}
                                        </Tag>
                                    </Tooltip>
                                    <Tooltip title="伙伴数">
                                        <Tag className={styles.tag}>
                                            <Icon icon="carbon:partnership" />{dataSharePartnerCount}
                                        </Tag>
                                    </Tooltip>
                                </Flex>
                            </Flex>
                            : null
                    }
                </Flex>
            </Flex>
            <Flex vertical align="end">
                {auth ? <Text>{`${username}`}</Text> : <Link onClick={login} >登录</Link>}
                {auth ? <Text type="success">在线</Text> : <Text type="warning">离线</Text>}
            </Flex>
            {auth ? <Popconfirm
                title="登出"
                description="确定登出？"
                onConfirm={logout}
                onCancel={() => { }}
                okText="是"
                cancelText="否"
            >
                <Avatar style={{ cursor: "pointer" }} alt={username} size="large" icon={auth ? <UserOutlined /> : null} src={auth ? avatar : null} />
            </Popconfirm>
                : <Avatar style={{ cursor: "pointer" }} alt={username} onClick={() => {
                    login();
                }} size="large" icon={auth ? <UserOutlined /> : null} src={auth ? avatar : null} />
            }
            <Modal
                title={`新版本详情[${latestVersion}]${latestVersionCreatedAt}`}
                width="80%"
                destroyOnClose
                open={isLatestChangelogContentModalOpen}
                onCancel={() => {
                    setIsLatestChangelogContentModalOpen(false);
                }}
                okText="下载新版本"
                onOk={() => {
                    try {
                        downloadLatest(versionObject);
                    } catch (e) {
                        messageApi.error(e.message);
                    }
                }}
            >
                <Markdown>
                    {latestChangelogContent}
                </Markdown>
            </Modal>
        </Flex>
    );
};

export default HeaderRight;