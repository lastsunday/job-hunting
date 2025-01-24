import App, { WORLD_BACKGROUND, WORLD_CONTENT_SCRIPT, WORLD_OFFSCREEN, WORLD_WEB_WORKER } from "@/common/extension/app";
export const CONTENT_SCRIPT = WORLD_CONTENT_SCRIPT;
export const BACKGROUND = WORLD_BACKGROUND;
export const OFFSCREEN = WORLD_OFFSCREEN;
export const WEB_WORKER = WORLD_WEB_WORKER;

export const getInvokeEnv = () => {
    return App.getWorld();
}