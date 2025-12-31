import { Client, Subtitle, groupBy, highestDownloadCountFirst } from "./client";

declare global {
    interface WindowEventMap {
        'user.logged-in': CustomEvent<void>,
        'language.updated': CustomEvent<string>,
        'available.subtitles.updated': CustomEvent<Subtitles>,
        'displayable.subtitles.updated': CustomEvent<Subtitles>,
        'subtitle.selected': CustomEvent<Subtitle>,
    }
}

type Subtitles = Record<string, Subtitle[]>;

export class OpenSubtitlesComponent {
    private client: Client;
    private loginComponent: LoginComponent;
    private subtitlesLoader: SubtitlesLoader;
    private languageSelector: LanguageSelector;
    private subtitleSelector: SubtitleSelector;

    constructor() {
        this.client = new Client();
        this.loginComponent = new LoginComponent(this.client);
        this.subtitlesLoader = new SubtitlesLoader(this.client);
        this.languageSelector = new LanguageSelector();
        this.subtitleSelector = new SubtitleSelector();
    }
}


// SubtitlesLoader is responsible for fetching the list of available subtitles from OpenSubtitles
class SubtitlesLoader {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        window.addEventListener('user.logged-in', this.onUserLoggedInEvent.bind(this));
    }

    private async onUserLoggedInEvent(event: CustomEvent<void>) {
        console.log('[subtitles-loader] user logged in. loading subtitles...')
        const response = await this.client.listSubtitles({ query: 'Pirates of the Caribean' })
        const grouped = groupBy(response.data, subtitle => subtitle.attributes.language);
        Object.keys(grouped).forEach(language => grouped[language].sort(highestDownloadCountFirst));
        window.dispatchEvent(new CustomEvent('available.subtitles.updated', { detail: grouped }));
    }
}

class LoginComponent {
    private client: Client;
    private formElement: HTMLFormElement;

    constructor(client: Client) {
        this.client = client;
        this.formElement = document.getElementById('open-subtitles-login-form') as HTMLFormElement;
        this.formElement.addEventListener('submit', this.onSubmit.bind(this));
    }

    private async onSubmit(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(this.formElement);
        const username = formData.get('username')?.valueOf() as string;
        const password = formData.get('password')?.valueOf() as string;
        // todo: improve error handling
        await this.client.login(username, password);
        window.dispatchEvent(new CustomEvent('user.logged-in'))
    }
}

class LanguageSelector {
    private formElement: HTMLFormElement;
    private dataListElement: HTMLDataListElement;

    constructor() {
        this.formElement = document.getElementById('language-form') as HTMLFormElement;
        this.dataListElement = document.getElementById('language-datalist') as HTMLDataListElement;

        this.formElement.addEventListener('change', this.onLanguageChangeEvent.bind(this));
        window.addEventListener('available.subtitles.updated', this.onAvailableSubtitlesUpdatedEvent.bind(this));
    }

    private onLanguageChangeEvent(event: Event) {
        event.preventDefault();
        const formData = new FormData(this.formElement);
        const language = formData.get('language')?.valueOf() as string;
        console.log('[language-selector] language updated', {language});
        window.dispatchEvent(new CustomEvent('language.updated', { detail: language }));
    }

    private onAvailableSubtitlesUpdatedEvent(event: CustomEvent<Subtitles>) {
        const languages = Object.keys(event.detail).sort();
        console.log('[language-selector] subtitles updated. updating languages', languages);
        this.updateDataListElementOptions(languages);
    }

    private updateDataListElementOptions(languages: string[]) {
        this.dataListElement.innerHTML = '';
        languages.forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.label = language;
            this.dataListElement.appendChild(option);
        })
    }
}

class SubtitleSelector {
    private availableSubtitles: Subtitles = {};
    private language?: string;
    private formElement: HTMLFormElement;

    constructor() {
        this.formElement = document.getElementById('subtitle-list') as HTMLFormElement;
        window.addEventListener('available.subtitles.updated', this.onAvailableSubtitlesUpdatedEvent.bind(this));
        window.addEventListener('language.updated', this.onLanguageUpdatedEvent.bind(this));
        window.addEventListener('subtitle.selected', this.onSubtitleSelectedEvent.bind(this));
    }

    get displayableSubtitles(): Subtitle[] {
        return this.language ? 
            this.availableSubtitles[this.language] :
            Object.values(this.availableSubtitles).flatMap(s => s);
    }

    private onAvailableSubtitlesUpdatedEvent(event: CustomEvent<Subtitles>) {
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
        this.formElement.innerHTML = '';

        subtitles.forEach(subtitle => {
            const button = document.createElement('button');
            button.value = subtitle.attributes.url;
            button.innerText = `${subtitle.attributes.download_count}`;
            button.type = 'button';
            button.className = 'offset-btn offset-btn--wide-large offset-btn--advance'
            button.onclick = () => window.dispatchEvent(new CustomEvent('subtitle.selected', { detail: subtitle }));
            this.formElement.appendChild(button);
        })
    }

    private onSubtitleSelectedEvent(event: CustomEvent<Subtitle>) {
        console.log('[subtitle-selector] subtitle selected', event.detail);
    }
}