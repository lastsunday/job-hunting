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