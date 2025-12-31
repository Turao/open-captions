import { Client, Subtitle, groupBy, highestDownloadCountFirst } from "./client";

declare global {
    interface WindowEventMap {
        'subtitles.updated': CustomEvent<Subtitles>,
        'content.updated': CustomEvent<string>,
        'language.updated': CustomEvent<string>,
        'subtitle.selected': CustomEvent<Subtitle>,
        'user.authenticated': CustomEvent<void>,
    }
}

const client = new Client();

type Subtitles = Record<string, Subtitle[]>;

export class OpenSubtitlesComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.render();
        window.addEventListener('user.authenticated', this.onUserAuthenticatedEvent.bind(this));
    }

    private async onUserAuthenticatedEvent(event: CustomEvent<void>) {
        // Show login component when user authenticates
        this.render();
        
        const response = await client.listSubtitles({ query: 'Pirates of the Caribean' })
        const grouped = groupBy(response.data, subtitle => subtitle.attributes.language);
        Object.keys(grouped).forEach(language => grouped[language].sort(highestDownloadCountFirst));
        window.dispatchEvent(new CustomEvent('subtitles.updated', { detail: grouped }));
    }

    private render() {
        if (!client.authenticated) {
            this.shadowRoot!.innerHTML = `
                <section class="section open-subtitles">
                    <open-subtitles-login-component></open-subtitles-login-component>
                </section>
            `;   
            return 
        }

        this.shadowRoot!.innerHTML = `
            <section class="section open-subtitles">
                <open-subtitles-content-details></open-subtitles-content-details>
                <open-subtitles-language-selector></open-subtitles-language-selector>
                <open-subtitles-subtitle-selector></open-subtitles-subtitle-selector>
            </section>
        `
    }
}

class ContentDetails extends HTMLElement {
    content: string = 'Pirates of the Caribean';
    element: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.render();
        this.element = this.shadowRoot!.getElementById('content-details') as HTMLDivElement;
        window.addEventListener('content.updated', this.onContentUpdated.bind(this));
    }

    private onContentUpdated(event: CustomEvent<string>) {
        this.content = event.detail?.valueOf() as string;
        this.element.innerHTML = `
            <label>You are watching:</label>
            ${this.content}
        `;
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <section class="section open-subtitles-current-video-details">
                <div id="content-details">
                </div>
            </section>
        `;
    }
}

class LoginComponent extends HTMLElement {
    private formElement: HTMLFormElement;

    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.render();
        this.formElement = this.shadowRoot!.getElementById('login-form') as HTMLFormElement;
        this.formElement.addEventListener('submit', this.onSubmit.bind(this));
    }

    private async onSubmit(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(this.formElement);
        const username = formData.get('username')?.valueOf() as string;
        const password = formData.get('password')?.valueOf() as string;
        // todo: improve error handling
        await client.login(username, password);
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <form id="login-form">
                <div class="input-fields-container">
                    <div>
                        <label for="username">Username</label>
                        <input id="username" type="text" name="username" required>
                    </div>
                    <div>
                        <label for="password">Password</label>
                        <input id="password" type="password" name="password" required>
                    </div>
                    <button type="submit">
                    <span>Login</span>
                    </button>
                </div>
            </form>
        `;
    }
}

class LanguageSelector extends HTMLElement {
    private formElement: HTMLFormElement;
    private selectElement: HTMLSelectElement;

    constructor(parent: ShadowRoot) {
        super();
        this.attachShadow({ mode:"open" })
        this.render();
        this.formElement = this.shadowRoot!.getElementById('language-form') as HTMLFormElement;
        this.selectElement = this.shadowRoot!.getElementById('language-select') as HTMLSelectElement;
        this.formElement.addEventListener('change', this.onLanguageChangeEvent.bind(this));
        window.addEventListener('subtitles.updated', this.onSubtitlesUpdatedEvent.bind(this));
    }

    private onLanguageChangeEvent(event: Event) {
        event.preventDefault();
        const formData = new FormData(this.formElement);
        const language = formData.get('language')?.valueOf() as string;
        console.log('[language-selector] language updated', {language});
        window.dispatchEvent(new CustomEvent('language.updated', { detail: language }));
    }

    private onSubtitlesUpdatedEvent(event: CustomEvent<Subtitles>) {
        const languages = Object.keys(event.detail).sort();
        console.log('[language-selector] subtitles updated. updating languages', languages);
        this.updateDataListElementOptions(languages);
    }

    private updateDataListElementOptions(languages: string[]) {
        this.selectElement.innerHTML = '';
        languages.forEach((language, idx) => {
            if (idx === 0) {
                window.dispatchEvent(new CustomEvent('language.updated', { detail: language }));
            }
            
            const option = document.createElement('option');
            option.value = language;
            option.label = language;
            this.selectElement.appendChild(option)
        })
        
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <form id="language-form">
                <label for="language-select">Language</label>
                <select id="language-select" name="language">
                </select>
            </form>
        `;
    }
}

class SubtitleSelector extends HTMLElement {
    private availableSubtitles: Subtitles = {};
    private language?: string;
    private selectElement: HTMLSelectElement;

    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.render();
        this.selectElement = this.shadowRoot!.getElementById('subtitle-select') as HTMLSelectElement;
        window.addEventListener('subtitles.updated', this.onSubtitlesUpdatedEvent.bind(this));
        window.addEventListener('language.updated', this.onLanguageUpdatedEvent.bind(this));
        window.addEventListener('subtitle.selected', this.onSubtitleSelectedEvent.bind(this));
    }

    get displayableSubtitles(): Subtitle[] {
        return this.language ? 
            this.availableSubtitles[this.language] :
            Object.values(this.availableSubtitles).flatMap(s => s);
    }

    private onSubtitlesUpdatedEvent(event: CustomEvent<Subtitles>) {
        this.availableSubtitles = event.detail;
        console.log('[subtitle-selector] subtitles updated', this.availableSubtitles);
        this.updateSubtitlesDatalist(this.displayableSubtitles);
    }

    private onLanguageUpdatedEvent(event: CustomEvent<string>) {
        this.language = event.detail;
        console.log('[subtitle-selector] language updated', this.language!);
        this.updateSubtitlesDatalist(this.displayableSubtitles);
    }

    private updateSubtitlesDatalist(subtitles: Subtitle[]) {
        this.selectElement.innerHTML = '';

        subtitles.forEach(subtitle => {
            const option = document.createElement('option');
            option.value = subtitle.attributes.url;
            option.innerText = `${subtitle.attributes.download_count}`;
            option.onchange = () => window.dispatchEvent(new CustomEvent('subtitle.selected', { detail: subtitle }));
            this.selectElement.appendChild(option);
        })
    }

    private onSubtitleSelectedEvent(event: CustomEvent<Subtitle>) {
        console.log('[subtitle-selector] subtitle selected', event.detail);
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <form id="subtitle-form">
            <label for="subtitle-select">Subtitle</label>
                <select id="subtitle-select" name="subtitle">
                </select>
            </form>
        `;
    }
}

export function init() {
    customElements.define('open-subtitles', OpenSubtitlesComponent);
    customElements.define('open-subtitles-login-component', LoginComponent);
    customElements.define('open-subtitles-content-details', ContentDetails);
    customElements.define('open-subtitles-language-selector', LanguageSelector);
    customElements.define('open-subtitles-subtitle-selector', SubtitleSelector);
}