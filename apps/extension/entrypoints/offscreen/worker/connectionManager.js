/**
 * ConnectionManager — PGlite 实例的包装管理器。
 *
 * 核心设计：getDb() 返回的 PGlite 实例被 Proxy 包装，
 * query() / transaction() / exec() 三个方法经过队列串行执行，
 * 确保单连接 PGlite 不会因并发调用导致事务交错或顺序混乱。
 *
 * 其他属性（close、closed、on 等）直接透传原始实例。
 */

const STATE = {
  UNINITIALIZED: 0,
  INITIALIZING: 1,
  READY: 2,
  CLOSED: 3,
  RECOVERY: 4,
};

class ConnectionManager {
  static #instance;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new ConnectionManager();
    }
    return this.#instance;
  }

  #state = STATE.UNINITIALIZED;
  #rawDb = null;
  #db = null;
  #initPromise = null;
  #initHandler = null;
  #queue = [];
  #busy = false;

  setInitHandler(handler) {
    this.#initHandler = handler;
  }

  async getDb() {
    if (this.#state === STATE.RECOVERY) {
      throw new Error(
        'get database error while current database in recovery mode'
      );
    }
    if (this.#state === STATE.READY && this.#rawDb && !this.#rawDb.closed) {
      return this.#db;
    }
    if (this.#state === STATE.INITIALIZING && this.#initPromise) {
      return this.#initPromise;
    }
    this.#state = STATE.INITIALIZING;
    this.#initPromise = this.#init();
    return this.#initPromise;
  }

  async #init() {
    try {
      const rawDb = (await this.#initHandler?.()) ?? null;
      this.#rawDb = rawDb;
      this.#db = this.#wrap(rawDb);
      this.#state = STATE.READY;
      return this.#db;
    } catch (e) {
      this.#state = STATE.UNINITIALIZED;
      this.#initPromise = null;
      throw e;
    }
  }

  #wrap(db) {
    if (!db) return db;
    const cm = this;
    return new Proxy(db, {
      get(target, prop) {
        if (prop === 'transaction' || prop === 'query' || prop === 'exec') {
          return (...args) => cm.#enqueue(prop, target, args);
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }

  async adoptDb(newDb) {
    if (this.#rawDb && !this.#rawDb.closed) {
      await this.#rawDb.close();
    }
    this.#rawDb = newDb;
    this.#db = this.#wrap(newDb);
    this.#state = STATE.READY;
    this.#initPromise = Promise.resolve(this.#db);
  }

  #enqueue(method, target, args) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ method, target, args, resolve, reject });
      this.#processQueue();
    });
  }

  async #processQueue() {
    if (this.#busy) return;
    this.#busy = true;
    while (this.#queue.length > 0) {
      const { method, target, args, resolve, reject } = this.#queue.shift();
      try {
        resolve(await target[method](...args));
      } catch (e) {
        reject(e);
      }
    }
    this.#busy = false;
  }

  async close() {
    if (this.#rawDb) {
      await this.#rawDb.close();
    }
    this.#state = STATE.CLOSED;
    this.#rawDb = null;
    this.#db = null;
  }

  async destroy() {
    await this.close();
    this.#state = STATE.UNINITIALIZED;
    this.#initPromise = null;
  }

  enterRecoveryMode() {
    this.#state = STATE.RECOVERY;
  }

  get state() {
    return this.#state;
  }

  get isReady() {
    return this.#state === STATE.READY;
  }
}

export const connectionManager = ConnectionManager.getInstance();
