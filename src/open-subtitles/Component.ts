import { Client, Subtitle, groupBy, highestDownloadCountFirst } from "./client";

declare global {
    interface WindowEventMap {
        'subtitles.updated': CustomEvent<Subtitles>,
        'content.updated': CustomEvent<string>,
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
    private formElement?: HTMLFormElement;

    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.render();
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

        this.formElement = this.shadowRoot!.getElementById('login-form') as HTMLFormElement;
        this.formElement.addEventListener('submit', this.onSubmit.bind(this));
    }
}

class SubtitleSelector extends HTMLElement {
    private availableSubtitles: Subtitles = {};
    
    private selectedLanguage?: string;
    private selectedSubtitle?: Subtitle;

    // html elements
    private languageFormElement?: HTMLFormElement;
    private subtitleFormElement?: HTMLFormElement;
    private downloadButton?: HTMLButtonElement;

    constructor() {
        super();
        this.attachShadow({mode:'open'})
        this.render();

        window.addEventListener('subtitles.updated', this.onSubtitlesUpdatedEvent.bind(this));
    }

    private onSubtitlesUpdatedEvent(event: CustomEvent<Subtitles>) {
        this.availableSubtitles = event.detail;

        // reset selections
        this.selectedLanguage = this.languages.length > 0 ? this.languages[0] : undefined;
        this.selectedSubtitle = this.selectedLanguage ? this.availableSubtitles[this.selectedLanguage][0] : undefined;

        this.render();
    }

    private onLanguageFormElementChangeEvent(event: Event) {
        event.preventDefault();
        const formData = new FormData(this.languageFormElement);
        const language = formData.get('language')?.valueOf() as string;
        this.selectedLanguage = language;
        this.selectedSubtitle = language ? this.availableSubtitles[language][0] : undefined;
        this.render();
    }

    private onSubtitleFormElementChangeEvent(event: Event) {
        const subtitleId = (event.target as HTMLSelectElement).value
        const subtitle = Object.values(this.availableSubtitles)
            .flatMap(s => s)
            .find(subtitle => subtitle.id === subtitleId);

        this.selectedSubtitle = subtitle;
        this.render();
    }

    private get languages(): string[] {
        return Object.keys(this.availableSubtitles);
    }

    private get displayableSubtitles(): Subtitle[] {
        return this.selectedLanguage ? 
            this.availableSubtitles[this.selectedLanguage] :
            Object.values(this.availableSubtitles).flatMap(s => s);
    }

    private onDownloadButtonClickEvent(event: Event) {
        event.preventDefault();
        console.log('download button clicked', { subtitle: this.selectedSubtitle })
    }

    private render() {
        const languageOptions = this.languages.map(language => {
            const optionId = `language-option-${language}`
            const selected = this.selectedLanguage === language ? 'selected' : '';
            return `
                <option ${selected} id="${optionId}" value="${language}">
                    ${language}
                </option>`
        })

        const subtitleOptions = this.displayableSubtitles.map(subtitle => {
            const optionId = `subtitle-option-${subtitle.id}`
            const selected = this.selectedSubtitle?.id === subtitle.id ? 'selected' : '';
            return `
                <option ${selected} id="${optionId}" value="${subtitle.id}">
                    ${subtitle.id} - ${subtitle.attributes.feature_details.feature_type} - ${subtitle.attributes.feature_details.title}
                </option>
            `
        })

        const downloadButton = `
            <button id="download-button">Download</button>
        `

        this.shadowRoot!.innerHTML = `
            <form id="language-form">
                <label for="language-select">Language</label>
                <select id="language-select" name="language">
                    ${languageOptions}
                </select>
            </form>

            <form id="subtitle-form">
                <label for="subtitle-select">Subtitle</label>
                <select id="subtitle-select" name="subtitle">
                    ${subtitleOptions}
                </select>
            </form>

            ${this.selectedSubtitle ? downloadButton : ``}
        `;

        // language dropdown
        this.languageFormElement = this.shadowRoot!.getElementById('language-form') as HTMLFormElement;
        this.languageFormElement.addEventListener('change', this.onLanguageFormElementChangeEvent.bind(this));

        // subtitle dropdown
        this.subtitleFormElement = this.shadowRoot!.getElementById('subtitle-form') as HTMLFormElement;
        this.subtitleFormElement.addEventListener('change', this.onSubtitleFormElementChangeEvent.bind(this));

        if (this.selectedSubtitle) {
            this.downloadButton = this.shadowRoot!.getElementById('download-button') as HTMLButtonElement;
            this.downloadButton.addEventListener('click', this.onDownloadButtonClickEvent.bind(this));
        }
    }
}

export function init() {
    customElements.define('open-subtitles', OpenSubtitlesComponent);
    customElements.define('open-subtitles-login-component', LoginComponent);
    customElements.define('open-subtitles-content-details', ContentDetails);
    customElements.define('open-subtitles-subtitle-selector', SubtitleSelector);
}