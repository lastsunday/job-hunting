// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><a href="index.html"><strong aria-hidden="true">1.</strong> 职位猎人</a></li><li class="chapter-item expanded "><a href="guide/index.html"><strong aria-hidden="true">2.</strong> 教程</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="guide/quickstart.html"><strong aria-hidden="true">2.1.</strong> 快速开始</a></li><li class="chapter-item expanded "><div><strong aria-hidden="true">2.2.</strong> 用户手册</div></li></ol></li><li class="chapter-item expanded "><a href="development/index.html"><strong aria-hidden="true">3.</strong> 开发</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="development/extension/index.html"><strong aria-hidden="true">3.1.</strong> 浏览器插件</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="development/extension/dev_in_deep.html"><strong aria-hidden="true">3.1.1.</strong> 深入开发</a></li><li class="chapter-item expanded "><a href="development/extension/core_logic_flow.html"><strong aria-hidden="true">3.1.2.</strong> 核心逻辑</a></li></ol></li><li class="chapter-item expanded "><div><strong aria-hidden="true">3.2.</strong> 独立 UI 组件</div></li><li><ol class="section"><li class="chapter-item expanded "><a href="development/component/analysis.html"><strong aria-hidden="true">3.2.1.</strong> 职位分析组件</a></li></ol></li><li class="chapter-item expanded "><a href="development/server/index.html"><strong aria-hidden="true">3.3.</strong> 服务器端</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="development/server/dev_in_deep.html"><strong aria-hidden="true">3.3.1.</strong> 深入开发</a></li><li class="chapter-item expanded "><a href="development/server/core_logic_flow.html"><strong aria-hidden="true">3.3.2.</strong> 核心逻辑</a></li><li class="chapter-item expanded "><a href="development/server/config_and_deploy.html"><strong aria-hidden="true">3.3.3.</strong> 配置与部署</a></li><li class="chapter-item expanded "><a href="development/server/testing.html"><strong aria-hidden="true">3.3.4.</strong> 测试</a></li></ol></li><li class="chapter-item expanded "><a href="development/datasource.html"><strong aria-hidden="true">3.4.</strong> 数据源</a></li></ol></li><li class="chapter-item expanded "><a href="CONTRIBUTING.html"><strong aria-hidden="true">4.</strong> 贡献</a></li><li class="chapter-item expanded "><div><strong aria-hidden="true">5.</strong> 开发日志</div></li><li><ol class="section"><li class="chapter-item expanded "><a href="solution/auto-explain.html"><strong aria-hidden="true">5.1.</strong> PGLite 数据库性能分析</a></li><li class="chapter-item expanded "><a href="solution/transaction.html"><strong aria-hidden="true">5.2.</strong> 在插件中 PGLite 事务问题</a></li><li class="chapter-item expanded "><a href="solution/dump.html"><strong aria-hidden="true">5.3.</strong> PGLite 数据库备份</a></li><li class="chapter-item expanded "><a href="solution/data-share-plan.html"><strong aria-hidden="true">5.4.</strong> 数据共享计划</a></li></ol></li><li class="chapter-item expanded "><div><strong aria-hidden="true">6.</strong> 帮助</div></li><li><ol class="section"><li class="chapter-item expanded "><a href="faq.html"><strong aria-hidden="true">6.1.</strong> FAQ</a></li></ol></li><li class="chapter-item expanded "><a href="disclaimer.html"><strong aria-hidden="true">7.</strong> 免责声明</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
