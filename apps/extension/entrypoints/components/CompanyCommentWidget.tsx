import { Badge, Flex, List, Modal, Tag } from 'antd';
import './CompanyCommentWidget.css';
import { CompanyComment } from "@/common/data/domain/companyComment";
import { convertTimeToHumanReadable } from "@/common/utils";
import Markdown from 'marked-react';
type Props = {
  companyName: string;
  companyCommentList: CompanyComment[];
};

const CompanyCommentWidget: React.FC<Props> = ({
  companyName,
  companyCommentList,
}) => {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalCancel = (e) => {
    e.stopPropagation();
    setIsModalOpen(false);
  };

  return (
    <Flex onClick={(e) => {
      e.stopPropagation();
    }}>
      {companyCommentList.length > 0 ? <Flex>
        <Badge onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsModalOpen(true);
        }} count={companyCommentList.length}>
          <Tag color="volcano">公司评论</Tag>
        </Badge>
      </Flex> : null}
      <Modal
        title={companyName}
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={null}
        width="80%"
      >
        <List
          itemLayout="vertical"
          dataSource={companyCommentList}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                title={<div><span>{index + 1}. </span> 评论来自:<span>{`<`}{item.sourceDataName}{'>'}</span> 更新时间:{convertTimeToHumanReadable(item.updateDatetime)}</div>}
              />
              <Markdown>
                {item.comment}
              </Markdown>
            </List.Item>
          )}
        />
      </Modal>
    </Flex>
  );
};

export default CompanyCommentWidget;
