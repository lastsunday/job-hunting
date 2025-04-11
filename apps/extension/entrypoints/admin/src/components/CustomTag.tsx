import { Tag, Tooltip } from 'antd';
import React from 'react';
import { TagData } from '../data/TagData';
import styles from './CustomTag.module.css';

interface CustomTagProps {
  color?: string;
  item: TagData;
}

const CustomTag: React.FC<CustomTagProps> = ({ color, item }) => {
  return (
    <Tooltip
      title={item.sourceList
        .filter((item) => item.source != null)
        .map((item) => item.source)
        .join(',')}
      color={color}
      key={item.tagId}
    >
      <Tag className={styles.tag} color={color}>
        {item.isPublic ? (
          <div className="i-material-symbols:public" />
        ) : (
          <div className="i-material-symbols:private-connectivity" />
        )}
        ({item.sourceList.length}
        {item.self ? '*' : ''}){item.tagName}
      </Tag>
    </Tooltip>
  );
};

export default CustomTag;
