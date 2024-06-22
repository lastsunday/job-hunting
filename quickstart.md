# Welcome to your Chrome Extension

## What's in this directory

``` text
├─ dist                                      
│  └─ chrome                                // build result folder for chrome
│  └─ firefox                               // build result folder for firefox
├─ docs                                     // readme resource folder
├─ public                                   // public folder,not compile,just copy to build floder
│  └─ icons                                 // logo
│  └─ app.css                               // inject to target web page
│  └─ proxyAjax.js                          // replace original XMLHttpRequest,hack the web page request
├─ src                                      // source
│  └─ background                            // backgournd
│  └─ common                                // common folder,include api,data,util,log...
│  └─ contentScript                         // content script
│  └─ offscreen                             // database,using worker
│  └─ sidepanel                             // admin page
│  └─ manifest.json                         // manifest file
```

## Test the extension

1. `pnpm run dev`
2. Open [chrome://extensions](chrome://extensions).
3. Enable developer mode (top right of page).
4. Click "Load unpacked extension" (top left page).
5. Select dist directory.

## Bundle the extension

To package the source code into static files for the Chrome webstore, execute `pnpm run build`.

## Documentation

Refer to [the Chrome developer documentation](https://developer.chrome.com/docs/extensions/mv3/getstarted/) to get started.
Refer to [Vite Plugin Web Extension](https://github.com/aklinker1/vite-plugin-web-extension) to get started.
