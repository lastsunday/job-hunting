import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { getDb } from "../database";

export const METHOD_SEARCH = "Search";
export const METHOD_ADD_OR_UPDATE = "AddOrUpdate";
export const METHOD_BATCH_ADD_OR_UPDATE = "BatchAddOrUpdate";
export const METHOD_GET_BY_ID = "GetById";
export const METHOD_GET_BY_IDS = "GetByIds";
export const METHOD_DELETE_BY_ID = "DeleteById";
export const METHOD_DELETE_BY_IDS = "DeleteByIds";

export default class BaseBridgeService {

  constructor(baseServiceInstance, serviceName) {
    this.baseServiceInstance = baseServiceInstance;
    this.serviceName = serviceName;
    this.methodNameMapping = new Map();
  }

  getMethodName(name) {
    return this.methodNameMapping.get(name);
  }

  getMethodNameMap() {
    return new Map(JSON.parse(JSON.stringify([...this.methodNameMapping])));
  }

}

export const addServiceMethod = ({ bridgeService = null, methodName = null, methodFunction = async ({ param = null } = {}) => { } } = {}) => {
  const targetMethodName = `${bridgeService.serviceName}${methodName}`;
  bridgeService.methodNameMapping.set(methodName, targetMethodName);
  bridgeService[targetMethodName] = async (message, param) => {
    try {
      await postSuccessMessage(message, await methodFunction({ param }));
    } catch (e) {
      await postErrorMessage(message, `[worker] ${targetMethodName} error : ` + e);
    }
  };
};

export const addTransactionServiceMethod = ({ bridgeService = null, methodName = null, methodFunction = async ({ param = null, tx = null } = {}) => { } } = {}) => {
  const targetMethodName = `${bridgeService.serviceName}${methodName}`;
  bridgeService.methodNameMapping.set(methodName, targetMethodName);
  bridgeService[targetMethodName] = async (message, param) => {
    try {
      const result = await (await getDb()).transaction(async (tx) => {
        return await methodFunction({ param, tx });
      });
      await postSuccessMessage(message, result);
    } catch (e) {
      await postErrorMessage(message, `[worker] ${targetMethodName} error : ` + e);
    }
  };
};

export const fillBaseServiceMethod = ({ bridgeService = null, overrideUpdateDatetime = false, overrideCreateDatetime = false } = {}) => {
  const { baseServiceInstance } = bridgeService;

  addServiceMethod({
    bridgeService, methodName: METHOD_SEARCH, methodFunction: async ({ param }) => {
      return await baseServiceInstance._search(param);
    }
  })

  addServiceMethod({
    bridgeService, methodName: METHOD_ADD_OR_UPDATE, methodFunction: async ({ param }) => {
      return await baseServiceInstance._addOrUpdate(param, { overrideUpdateDatetime, overrideCreateDatetime });
    }
  })

  addTransactionServiceMethod({
    bridgeService, methodName: METHOD_BATCH_ADD_OR_UPDATE, methodFunction: async ({ param, tx }) => {
      return await baseServiceInstance._batchAddOrUpdate(param.items,
        {
          overrideUpdateDatetime: param.overrideUpdateDatetime ?? overrideUpdateDatetime,
          overrideCreateDatetime: param.overrideCreateDatetime ?? overrideCreateDatetime,
          connection: tx
        });
    }
  })

  addServiceMethod({
    bridgeService, methodName: METHOD_GET_BY_ID, methodFunction: async ({ param }) => {
      return await baseServiceInstance._getById(param);
    }
  })

  addServiceMethod({
    bridgeService, methodName: METHOD_GET_BY_IDS, methodFunction: async ({ param }) => {
      return await baseServiceInstance._getByIds(param);
    }
  })

  addServiceMethod({
    bridgeService, methodName: METHOD_DELETE_BY_ID, methodFunction: async ({ param }) => {
      return await baseServiceInstance._deleteById(param);
    }
  })

  addServiceMethod({
    bridgeService, methodName: METHOD_DELETE_BY_IDS, methodFunction: async ({ param }) => {
      return await baseServiceInstance._deleteByIds(param);
    }
  })
}
