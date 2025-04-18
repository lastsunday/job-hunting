import { infoLog } from "@/common/log";
export const WORLD_CONTENT_SCRIPT = "CONTENT_SCRIPT";
export const WORLD_BACKGROUND = "BACKGROUND";
export const WORLD_OFFSCREEN = "OFFSCREEN";
export const WORLD_WEB_WORKER = "WEB_WORKER";

const regexWorldList = [
    { regex: /.*worker.*\.js/, world: WORLD_WEB_WORKER },
    { regex: /.*offscreen.*\.html/, world: WORLD_OFFSCREEN },
    { regex: /.*background.*\.js/, world: WORLD_BACKGROUND },
]

const App = (() => {

    let _world = WORLD_CONTENT_SCRIPT;

    const _init = () => {
        //升级到wxt v0.20.1后，需要判断location == "undefined"
        //由于添加了特性 fix: Don't remove top-level destructured variable definitions when importing entrypoints，会导致该文件在wxt prepare的阶段下执行，并且由于location是undefined，所以出错
        //https://github.com/wxt-dev/wxt/pull/1561
        //https://github.com/wxt-dev/wxt/commit/ad63b595b43b2af427607c7f2b6f5b3d3bba01f5
        if (typeof location == "undefined") {
            return;
        }
        const pathname = location.pathname;
        infoLog(`[App] location pathname = ${pathname}`);
        for (let i = 0; i < regexWorldList.length; i++) {
            const { regex, world } = regexWorldList[i];
            if (regex.test(pathname)) {
                _world = world;
            }
        }
        infoLog(`[App] world = ${_world}`);
    }

    _init();

    const api = {

        setWorld(world) {
            _world = world;
        },

        getWorld() {
            return _world;
        },

        isWorld(world) {
            return _world == world;
        }

    }

    return api;

})();

export default App;