// 国际化管理器
class I18nManager {
    constructor() {
        this.currentLanguage = 'zh';
        this.translations = {};
        this.config = {};
        this.fallbackLanguage = 'zh';
        
        this.init();
    }

    async init() {
        try {
            // 加载配置文件
            await this.loadConfig();
            
            // 从localStorage获取用户语言偏好，或使用配置的默认语言
            const savedLanguage = localStorage.getItem('preferred_language');
            const browserLanguage = navigator.language.startsWith('zh') ? 'zh' : 'en';
            
            this.currentLanguage = savedLanguage || 
                                 this.config.features?.default_language || 
                                 browserLanguage;

            // 确保语言在支持列表中
            const supportedLanguages = this.config.features?.supported_languages || ['zh', 'en'];
            if (!supportedLanguages.includes(this.currentLanguage)) {
                this.currentLanguage = this.fallbackLanguage;
            }

            // 加载语言文件
            await this.loadLanguage(this.currentLanguage);
            
            // 应用翻译
            this.applyTranslations();
            
            // 设置语言切换器
            this.setupLanguageSwitcher();
            
            console.log(`I18n initialized with language: ${this.currentLanguage}`);
        } catch (error) {
            console.error('I18n initialization failed:', error);
            // 降级到默认行为
            this.currentLanguage = this.fallbackLanguage;
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/static/config.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            this.config = await response.json();
        } catch (error) {
            console.error('Failed to load config:', error);
            // 使用默认配置
            this.config = {
                school: {
                    name_zh: "长春理工大学",
                    name_en: "Changchun University of Science and Technology",
                    short_name_zh: "CUST",
                    short_name_en: "CUST",
                    location_zh: "宿舍",
                    location_en: "Dormitory"
                },
                app: {
                    title_zh: "实时温度",
                    title_en: "Real-time Temperature",
                    description_zh: "宿舍环境数据展示",
                    description_en: "Dormitory Environment Data Display"
                },
                features: {
                    enable_language_switch: true,
                    default_language: "zh",
                    supported_languages: ["zh", "en"]
                }
            };
        }
    }

    async loadLanguage(language) {
        try {
            const response = await fetch(`/static/js/i18n/${language}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language ${language}: ${response.status}`);
            }
            this.translations[language] = await response.json();
        } catch (error) {
            console.error(`Failed to load language ${language}:`, error);
            if (language !== this.fallbackLanguage) {
                // 尝试加载备用语言
                await this.loadLanguage(this.fallbackLanguage);
            }
        }
    }

    t(key, params = {}) {
        const translation = this.getNestedValue(this.translations[this.currentLanguage], key) ||
                          this.getNestedValue(this.translations[this.fallbackLanguage], key) ||
                          key;

        // 替换配置变量
        let result = this.replaceConfigVariables(translation);
        
        // 替换参数变量
        result = this.replaceParams(result, params);
        
        return result;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    replaceConfigVariables(text) {
        if (typeof text !== 'string') return text;
        
        const configVars = {
            school_name: this.config.school?.[`name_${this.currentLanguage}`] || this.config.school?.name_zh || 'School',
            school_short: this.config.school?.[`short_name_${this.currentLanguage}`] || this.config.school?.short_name_zh || 'SCHOOL',
            location: this.config.school?.[`location_${this.currentLanguage}`] || this.config.school?.location_zh || 'Location',
            app_title: this.config.app?.[`title_${this.currentLanguage}`] || this.config.app?.title_zh || 'App',
            app_description: this.config.app?.[`description_${this.currentLanguage}`] || this.config.app?.description_zh || 'Description',
            footer_text: this.config.app?.[`footer_text_${this.currentLanguage}`] || this.config.app?.footer_text_zh || 'Footer',
            powered_by: this.config.app?.powered_by || 'Powered By System',
            powered_by_url: this.config.app?.powered_by_url || '#'
        };

        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return configVars[key] || match;
        });
    }

    replaceParams(text, params) {
        if (typeof text !== 'string') return text;
        
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    applyTranslations() {
        // 更新页面标题
        document.title = this.t('header.title');
        
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const params = this.getElementParams(element);
            element.textContent = this.t(key, params);
        });

        // 更新所有带有 data-i18n-html 属性的元素（支持HTML内容）
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const params = this.getElementParams(element);
            element.innerHTML = this.t(key, params);
        });

        // 更新所有带有 data-i18n-placeholder 属性的输入框
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const params = this.getElementParams(element);
            element.placeholder = this.t(key, params);
        });

        // 更新所有带有 data-i18n-title 属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const params = this.getElementParams(element);
            element.title = this.t(key, params);
        });

        // 更新favicon
        if (this.config.school?.favicon_url) {
            const favicon = document.querySelector('link[rel="icon"]');
            if (favicon) {
                favicon.href = this.config.school.favicon_url;
            }
        }

        // 更新powered_by链接
        const poweredByLink = document.getElementById('powered-by-link');
        if (poweredByLink && this.config.app?.powered_by_url) {
            poweredByLink.href = this.config.app.powered_by_url;
        }
    }

    getElementParams(element) {
        const params = {};
        // 从 data-i18n-* 属性中提取参数
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-i18n-param-')) {
                const paramName = attr.name.replace('data-i18n-param-', '');
                params[paramName] = attr.value;
            }
        });
        return params;
    }

    setupLanguageSwitcher() {
        if (!this.config.features?.enable_language_switch) {
            return;
        }

        // 确保DOM已准备好
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupLanguageSwitcher());
            return;
        }

        // 创建语言切换器
        const languageSwitcher = this.createLanguageSwitcher();

        // 将语言切换器添加到"Powered by"链接的同一行
        const poweredByLink = document.querySelector('#powered-by-link');
        if (poweredByLink && languageSwitcher) {
            // 在"Powered by"链接后添加分隔符和语言切换器
            const separator = document.createTextNode(' | ');
            const languageText = document.createElement('span');
            languageText.className = 'footer-language-inline';

            // 将语言切换器的内容提取出来，作为内联元素
            const button = languageSwitcher.querySelector('button');
            if (button) {
                // 创建简化的内联语言切换器
                const inlineLanguageSwitcher = this.createInlineLanguageSwitcher();
                languageText.appendChild(inlineLanguageSwitcher);

                // 添加到"Powered by"链接后面
                poweredByLink.parentNode.appendChild(separator);
                poweredByLink.parentNode.appendChild(languageText);
            }

            // 添加响应式监听
            this.setupResponsiveLanguageSwitcher(languageText);
        } else if (!poweredByLink) {
            console.warn('Footer powered-by link not found, language switcher not added');
        }
    }

    createInlineLanguageSwitcher() {
        try {
            const supportedLanguages = this.config.features?.supported_languages || ['zh', 'en'];
            if (supportedLanguages.length <= 1) {
                return null;
            }

            // 创建简单的内联语言切换链接
            const container = document.createElement('span');
            container.className = 'language-switcher-inline';

            supportedLanguages.forEach((lang, index) => {
                if (index > 0) {
                    const separator = document.createTextNode(' / ');
                    container.appendChild(separator);
                }

                const link = document.createElement('a');
                link.href = '#';
                link.className = `language-link ${lang === this.currentLanguage ? 'active' : ''}`;
                link.setAttribute('data-language', lang);
                link.textContent = lang === 'zh' ? '中文' : 'English';

                // 添加点击事件
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchLanguage(lang);
                });

                container.appendChild(link);
            });

            return container;
        } catch (error) {
            console.error('Failed to create inline language switcher:', error);
            return null;
        }
    }

    createLanguageSwitcher() {
        try {
            const supportedLanguages = this.config.features?.supported_languages || ['zh', 'en'];
            if (supportedLanguages.length <= 1) {
                return null;
            }

            const switcher = document.createElement('div');
            switcher.className = 'language-switcher';
            switcher.style.cssText = 'z-index: 1000;';

            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown';

            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('data-bs-toggle', 'dropdown');

            // 检测是否为移动设备
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // 移动端：圆形按钮，只显示图标
                button.className = 'btn btn-outline-secondary btn-sm dropdown-toggle';
                button.innerHTML = `<i class="bi bi-globe"></i>`;
                button.setAttribute('title', this.getCurrentLanguageDisplayName()); // 添加提示文本
                // CSS样式由CSS文件控制，确保圆形显示
                button.style.cssText = '';
            } else {
                // 桌面端：标准样式，显示图标和文字
                button.className = 'btn btn-outline-secondary btn-sm dropdown-toggle';
                button.innerHTML = `<i class="bi bi-globe"></i> ${this.getCurrentLanguageDisplayName()}`;
            }

            const menu = document.createElement('ul');
            menu.className = 'dropdown-menu dropdown-menu-end';

            supportedLanguages.forEach(lang => {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.className = `dropdown-item ${lang === this.currentLanguage ? 'active' : ''}`;
                link.href = '#';
                link.setAttribute('data-language', lang); // 添加语言标识

                // 安全地获取翻译文本
                const languageText = lang === 'zh' ? '中文' : 'English';
                link.textContent = languageText;

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchLanguage(lang);
                });

                item.appendChild(link);
                menu.appendChild(item);
            });

            dropdown.appendChild(button);
            dropdown.appendChild(menu);
            switcher.appendChild(dropdown);

            return switcher;
        } catch (error) {
            console.error('Failed to create language switcher:', error);
            return null;
        }
    }

    setupResponsiveLanguageSwitcher(languageSwitcher) {
        // 内联语言切换器不需要复杂的响应式处理
        // CSS已经处理了不同屏幕尺寸的样式
    }

    async switchLanguage(language) {
        if (language === this.currentLanguage) return;

        try {
            // 加载新语言文件（如果尚未加载）
            if (!this.translations[language]) {
                await this.loadLanguage(language);
            }

            this.currentLanguage = language;
            localStorage.setItem('preferred_language', language);

            // 重新应用翻译
            this.applyTranslations();

            // 更新内联语言切换器状态
            const languageLinks = document.querySelectorAll('.language-link');
            if (languageLinks.length > 0) {
                languageLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('data-language') === language) {
                        link.classList.add('active');
                    }
                });
            }

            // 通知其他组件语言已切换
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: this.currentLanguage }
            }));

            console.log(`Language switched to: ${language}`);
        } catch (error) {
            console.error(`Failed to switch language to ${language}:`, error);
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getCurrentLanguageDisplayName() {
        return this.currentLanguage === 'zh' ? '中文' : 'English';
    }

    getConfig() {
        return this.config;
    }
}

// 全局实例
window.i18n = new I18nManager();
