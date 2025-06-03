import { EXCEPTION, GithubApi } from "@/common/api/github";
import { COMMENT_PAGE_SIZE } from "@/common/config";
import { convertTimeOffsetToHumanReadable, randomDelay } from "@/common/utils";
import { Avatar, Card, Empty, Flex, FloatButton, Modal, Pagination, Spin, Typography, message } from "antd";
import Link from "antd/es/typography/Link";
import { CommentData, convertCommentList } from "../../data/CommentData";
import { IssueCommentEditData } from "../../data/IssueCommentEditData";
import { IssueData } from "../../data/IssueData";
import Comment from "./Comment";
import IssueCommentEdit from "./IssueCommentEdit";
const { Text } = Typography;
import useAuthStore from '../../store/AuthStore';
import { useShallow } from 'zustand/shallow';
export type IssueCommentViewProps = {
  data: IssueData;
};
const IssueCommentView: React.FC<IssueCommentViewProps> = ({ data }) => {

  const { author, bodyHTML, createdAt, bodyUrl, number } = data;
  const { avatarUrl, login } = author;
  const [commentData, setCommentData] = useState<CommentData[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(COMMENT_PAGE_SIZE);
  const [refresh, setRefresh] = useState(false);
  const commentTitleRef = useRef(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [editData, setEditData] = useState<IssueCommentEditData>();
  const [isIssueCommentModalOpen, setIsIssueCommentModalOpen] = useState(false);
  const [auth] = useAuthStore(
    useShallow((state) => [state.auth])
  );
  useEffect(() => {
    const search = async () => {
      if (!auth) {
        messageApi.open({
          key: "needLogin",
          type: 'warning',
          content: `需要登录后查看`,
        });
        return;
      }
      //scroll to top
      scrollToTop();
      setLoading(true);
      try {
        let result = await GithubApi.listIssueComment(number, { pageSize: pageSize, pageNum: currentPage });
        setCommentData(convertCommentList(result.items))
        if (result.lastPageNum != null) {
          setTotal(result.lastPageNum * pageSize);
        }
      } catch (e) {
        messageApi.open({
          type: 'error',
          content: `查询失败`,
        });
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [currentPage, pageSize, refresh])

  const scrollToTop = () => {
    commentTitleRef.current.scrollIntoView();
  }

  const onPageChange = (page: number, pageSize: number) => {
    if (page > currentPage) {
      setCurrentPage(currentPage + 1);
    } else {
      setCurrentPage(currentPage - 1);
    }
    setPageSize(pageSize)
  }

  const onIssueCommentEditOpen = () => {
    setEditData({ number: number })
    setIsIssueCommentModalOpen(true);
  }

  const onIssueCommentSave = async (data: IssueCommentEditData) => {
    try {
      await GithubApi.createIssueComment(data.number, data.content);
      messageApi.open({
        type: 'success',
        content: `新增评论成功`,
      });
      //延迟，以便能刷新出新讨论
      await randomDelay(1000, 0);
      setIsIssueCommentModalOpen(false);
      setRefresh(!refresh)
    } catch (e) {
      messageApi.open({
        type: 'error',
        content: `新增评论失败`,
      });
    }
  }

  return <>
    {contextHolder}
    <FloatButton.Group
      shape="square"
    >
      <FloatButton type="primary" tooltip="新增评论" onClick={onIssueCommentEditOpen} />
      <FloatButton.BackTop onClick={scrollToTop} visibilityHeight={0} />
    </FloatButton.Group>
    <Flex vertical gap={10}>
      <Text type="warning">原讨论内容</Text>
      <Card title={<Flex align="end" gap={5}>
        <Avatar alt={login} size="large" src={avatarUrl} />
        <Text>{login}</Text>
        <Text type="secondary">{convertTimeOffsetToHumanReadable(createdAt)}</Text>
      </Flex>}
        extra={
          <Link href={bodyUrl} target="_blank">来源</Link>
        }
      >
        <div dangerouslySetInnerHTML={
          { __html: bodyHTML }
        }></div>
      </Card>
      <Flex vertical gap={5}>
        <Text ref={commentTitleRef} type="secondary">评论</Text>
        <Spin spinning={loading}>
          <Flex vertical gap={10}>
            {commentData && commentData.length > 0 ?
              commentData.map((item, index) => (
                <Comment key={item.id} data={item}></Comment>
              )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }
            <Pagination simple current={currentPage} total={total} pageSize={pageSize} onChange={onPageChange} />
          </Flex>
        </Spin>
      </Flex>
    </Flex>
    <Modal
      title={"新增评论"}
      open={isIssueCommentModalOpen}
      onCancel={() => {
        setIsIssueCommentModalOpen(false);
      }}
      maskClosable={false}
      footer={null}
      style={{ maxWidth: "1000px" }}
      width="80%"
      destroyOnClose
    >
      <IssueCommentEdit data={editData} onSave={onIssueCommentSave}></IssueCommentEdit>
    </Modal>
  </>
}
export default IssueCommentView;
