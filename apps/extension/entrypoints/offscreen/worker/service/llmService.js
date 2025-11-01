import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { MLCEngine, prebuiltAppConfig, hasModelInCache, deleteModelAllInfoInCache } from "@mlc-ai/web-llm";
import { infoLog } from "@/common/log";
import { LlmCompletionBO } from "@/common/data/bo/llmCompletionBO";

let engine;
let initializing = false;

export async function getLlm() {
  return await _init();
}

export const LlmService = {


  /**
   * 
   * @param {*} message 
   * @param {*} param 
   */
  llmInit: async function (message, param) {
    try {
      await _init(param);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] init error : " + e.message
      );
    }
  },

  /**
   * 
   * @param {*} message 
   * @param {LlmResetBO} param 
   */
  llmReset: async function (message, param) {
    try {
      await _reset(param);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] reset error : " + e.message
      );
    }
  },

  /**
   * 
   * @param {*} message 
   * @param {LlmCompletionBO} param 
   */
  llmCompletion: async function (message, param) {
    try {
      postSuccessMessage(message, await _completion(param));
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] completion error : " + e.message
      );
    }
  },


  /**
 * 
 * @param {*} message 
 * @param {*} param 
 */
  llmUnload: async function (message, param) {
    try {
      await _unload(param);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] unload error : " + e.message
      );
    }
  },

  /**
 * 
 * @param {*} message 
 * @param {*} param 
 */
  llmClear: async function (message, param) {
    try {
      await _clear(param);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] clear error : " + e.message
      );
    }
  },

  /**
 * 
 * @param {*} message 
 * @param {*} param 
 */
  llmSupportInfo: async function (message, param) {
    try {
      postSuccessMessage(message, await _supportInfo(param));
    } catch (e) {
      postErrorMessage(
        message,
        "[worker] supportInfo error : " + e.message
      );
    }
  },

};

/**
 * 
 * @param {*} param 
 */
export async function _supportInfo(param) {
  return {
    model_list: [
      {
        label: "小型量化模型0.6B(Qwen3)",
        value: "Qwen3-0.6B-q4f32_1-MLC",
      },
      {
        label: "小型量化模型1.7B(Qwen3)",
        value: "Qwen3-1.7B-q4f32_1-MLC",
      },
      {
        label: "中型量化模型4B(Qwen3)",
        value: "Qwen3-4B-q4f32_1-MLC",
      },
      {
        label: "中型量化模型8B(Qwen3)",
        value: "Qwen3-8B-q4f32_1-MLC",
      },
    ]
  }
}

/**
 * 
 * @param {LlmResetBO} param 
 */
export async function _reset(param) {
  let model = param.model ?? (await _supportInfo()).model_list[0].value;
  await (await getLlm()).reload(model);
  const gpuVendor = await (await getLlm()).getGPUVendor();
  infoLog(`[LLM] Model <${model}> loaded successfully! gpuVendor = ${gpuVendor}]`);
}

export async function _init(param) {
  if (initializing) {
    return engine;
  }
  if (!initializing) {
    initializing = true;
    infoLog("[LLM] initializing...");
    // Initialize with a progress callback
    const initProgressCallback = (progress) => {
      infoLog(`[LLM] Model loading progress: ${JSON.stringify(progress)}`);
    };
    // This is a synchronous call that returns immediately
    let appConfig = Object.assign(prebuiltAppConfig, {
      useIndexedDBCache: true,
    });
    engine = new MLCEngine({
      initProgressCallback: initProgressCallback,
      appConfig
    });
    // This is an asynchronous call and can take a long time to finish
    return engine;
  } else {
    return engine;
  }

}

export async function _clear(param) {
  const appConfig = prebuiltAppConfig;
  appConfig.useIndexedDBCache = true;
  const model_list = appConfig.model_list;
  for (let i = 0; i < model_list.length; i++) {
    let model = model_list[i];
    let model_id = model.model_id;
    let modelCached = await hasModelInCache(model_id, appConfig);
    if (modelCached) {
      infoLog(`[LLM] has model<${model_id}> cache!`);
      await deleteModelAllInfoInCache(model_id, appConfig);
      modelCached = await hasModelInCache(model_id, appConfig);
      if (modelCached) {
        infoLog(`[LLM] delete model<${model_id}> failure!`);
      } else {
        infoLog(`[LLM] delete model<${model_id}> successfully!`);
      }
    }
  }
  infoLog(`[LLM] clear successfully!`);
}

export async function _unload(param) {
  if (engine) {
    await engine.unload();
  }
  initializing = false;
  engine = null;
  infoLog(`[LLM] unload successfully!`);
}

/**
 * 
 * @param {LlmCompletionBO} param 
 */
export async function _completion(param) {
  const reply = await engine.chat.completions.create({
    messages: param.messages,
  });
  return reply;
}


