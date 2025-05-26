import * as modUtil from "@/common/extension/worker/util";
import { genSha256 } from "@/common/utils";
import { parse } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_ADD_OR_UPDATE, METHOD_BATCH_ADD_OR_UPDATE, METHOD_DELETE_BY_ID, METHOD_DELETE_BY_IDS,
  METHOD_GET_BY_ID, METHOD_GET_BY_IDS, METHOD_SEARCH
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import Service from "@/entrypoints/offscreen/worker/service/dataSourceMetadataService";
import { PGlite } from "@electric-sql/pglite";
import { TYPE_GIT_METADATA, SOURCE_METADATA_FETCH_TYPE_EMBEDDED } from "@/common/data/domain/dataSourceMetadata";
import { expect, test, vi } from "vitest";
test('data source metadata service method name correct', async () => {
  const result = Service.getMethodNameMap();
  expect(result.size).greaterThan(0);
});

test('data source metadata service crud logic correct', async () => {
  const item = {
    id: null,
    name: "默认",
    description: "默认数据源元数据",
    icon: "",
    type: TYPE_GIT_METADATA,
    config: {
      url: "https://github.com/lastsunday/job-hunting-data-source",
      filePath: "metadata.json",
    },
    data: {
      sourceList: [
        {
          name: "默认",
          repoType: "GITHUB",
          username: "lastsunday",
          reponame: "job-hunting-data-source",
          description: "默认数据源",
          config: [
            {
              name: "深圳避雷公司名单",
              type: "COMPANY_COMMENT_DOWNLOAD",
              fileName: "mine_field_shenzhen",
              emotion: -1,
            },
            {
              name: "广州避雷公司名单",
              type: "COMPANY_COMMENT_DOWNLOAD",
              fileName: "mine_field_guangzhou",
              emotion: -1,
            }
          ]
        },
      ],
    },
    enable: true,
    seq: null,
    autoUpdateEnable: true,
    createDatetime: parse("2025-05-19"),
    updateDatetime: parse("2025-05-19"),
  };
  const item2 = {
    id: null,
    name: "默认2",
    description: "默认2数据源元数据",
    icon: "",
    type: TYPE_GIT_METADATA,
    config: {
      url: "https://github.com/lastsunday/job-hunting-data-source",
      filePath: "metadata.json",
    },
    data: {
      sourceList: [
        {
          name: "默认",
          repoType: "GITHUB",
          username: "lastsunday",
          reponame: "job-hunting-data-source",
          description: "默认数据源",
          config: [
            {
              name: "深圳避雷公司名单",
              type: "COMPANY_COMMENT_DOWNLOAD",
              fileName: "mine_field_shenzhen",
              emotion: -1,
              description: "来自网络收集",
            },
            {
              name: "广州避雷公司名单",
              type: "COMPANY_COMMENT_DOWNLOAD",
              fileName: "mine_field_guangzhou",
              emotion: -1,
              description: "来自网络收集",
            }
          ]
        },
      ],
    },
    enable: true,
    seq: null,
    autoUpdateEnable: true,
    createDatetime: parse("2025-05-19"),
    updateDatetime: parse("2025-05-19"),
  };
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  let itemId = null;
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item = data;
    expect(item.name).toBe(("默认"));
    itemId = item.id;
  });
  await Service[Service.getMethodName(METHOD_ADD_OR_UPDATE)]({}, item);
  let itemId2 = null;
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item2 = data[0];
    expect(item2.name).toBe(("默认2"));
    itemId2 = item2.id
  });
  await Service[Service.getMethodName(METHOD_BATCH_ADD_OR_UPDATE)]({}, { items: [item2] });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(5);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(1);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, {
    pageNum: 1,
    pageSize: 1,
    id: [itemId],
    enable: true,
    autoUpdateEnable: true,
    startDatetimeForCreate: parse("2025-05-19"),
    endDatetimeForCreate: parse("2025-05-20"),
    startDatetimeForUpdate: parse("2025-05-19"),
    endDatetimeForUpdate: parse("2025-05-20"),
  });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data;
    expect(item.name).toBe(("默认"));
  });
  await Service[Service.getMethodName(METHOD_GET_BY_ID)]({}, itemId);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data[0];
    expect(item.name).toBe(("默认"));
  });
  await Service[Service.getMethodName(METHOD_GET_BY_IDS)]({}, [itemId]);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data[0].affectedRows).toBe(1);
  });
  await Service[Service.getMethodName(METHOD_DELETE_BY_ID)]({}, itemId2);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(4);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data[0].affectedRows).toBe(1);
  });
  await Service[Service.getMethodName(METHOD_DELETE_BY_IDS)]({}, [itemId]);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(3);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
})
