import * as React from "react";
import { JobData } from "../../data/JobData";
import { Marker } from "@vis.gl/react-maplibre";

import styles from "./JobPin.module.css";
import { Flex, Tag, Typography } from "antd";

const { Text } = Typography;
import { useJob } from "../../hooks/job";
const { platformLogo } = useJob();

export type JobPinProps = {
  data: JobData;
  onClick?: (data) => void;
};
const JobPin: React.FC<JobPinProps> = ({ data, onClick }) => {
  const {
    latitude,
    longitude,
    name,
    desc,
    platform,
    salaryMin,
    salaryMax,
    jobTagList,
  } = data;
  const { name: companyName, companyTagList } = data.company;
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="top"
      onClick={(e) => {
        // If we let the click event propagates to the map, it will immediately close the popup
        // with `closeOnClick: true`
        e.originalEvent.stopPropagation();
        onClick(data);
      }}
    >
      <Flex vertical className={styles.mapIcon} title={desc}>
        <Flex align="center">
          <img
            className={styles.logo}
            src={platformLogo(platform)}
            alt="logo"
          />
          <Text ellipsis> {name}</Text>
        </Flex>
        <Flex>
          <Text ellipsis>
            💵{Math.ceil(salaryMin)} - 💵{Math.ceil(salaryMax)}
          </Text>
        </Flex>
        <Flex>
          <Text ellipsis>{companyName}</Text>
        </Flex>
        <Flex wrap>
          {jobTagList != null
            ? jobTagList.map((item, index) => (
                <Tag
                  style={{ marginTop: "5px" }}
                  color="#1677ff"
                  key={`${index}`}
                >
                  {item.tagName}
                </Tag>
              ))
            : null}
          {companyTagList != null
            ? companyTagList.map((item, index) => (
                <Tag
                  style={{ marginTop: "5px" }}
                  color="#faad14"
                  key={`${index}`}
                >
                  {item.tagName}
                </Tag>
              ))
            : null}
        </Flex>
      </Flex>
    </Marker>
  );
};

export default JobPin;
