const APPLICATION_JSON = 'application/json'
const USER_AGENT = 'OpenCaptions v0.1'
const BASE_URL = 'https://api.opensubtitles.com/api/v1'
const API_KEY = 'JXyv9apSImdsX8m1KvcPidXxTyGTVExN' // we should be fetching the api key from a server

type ListSubtitlesRequest = {
    query: string;
}

type ListSubtitlesResponse = {
    total_pages: number;
    total_count: number;
    per_page: number;
    page: number;
    data: Subtitle[];
};

export type Subtitle = {
    id: string;
    type: string;
    attributes: {
        subtitle_id: string;
        language: string;
        download_count: number;
        url: string;
        feature_details: {
            feature_type: string;
            title: string;
            year: number;
        }
    };
}

export class Client {
    private token?: string;

    constructor() {
        this.loadTokenFromStorage();
    }

    get authenticated() {
        return this.token !== undefined;
    }

    private async loadTokenFromStorage() {
        const data = await chrome.storage.sync.get('open-subtitles-token');
        const token = data['open-subtitles-token'] as string | undefined;
        if (token) {
            this.token = token;
            window.dispatchEvent(new CustomEvent('user.authenticated'));
        }
    }

    private async setToken(token: string) {
        this.token = token;
        await chrome.storage.sync.set({ 'open-subtitles-token': token });
    }

    async login(username: string, password: string): Promise<void> {
        console.log('logging into open subtitles')
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            mode: "cors",
            headers: {
                'Accept': APPLICATION_JSON,
                'Content-Type': APPLICATION_JSON,
                'X-User-Agent': USER_AGENT,
                'Api-Key': API_KEY,
            },
            body: JSON.stringify({
                username: username, 
                password: password,
            })
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        this.setToken(result.token);
        window.dispatchEvent(new CustomEvent('user.authenticated'));
    }

    async listSubtitles(request: ListSubtitlesRequest): Promise<ListSubtitlesResponse> {
        return await cached(this._listSubtitles.bind(this))(request);
    }

    private async _listSubtitles(request: ListSubtitlesRequest): Promise<ListSubtitlesResponse> {
        const queryParameters = new URLSearchParams({
            query: request.query,
        })

        const response = await fetch(`${BASE_URL}/subtitles?${queryParameters.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': APPLICATION_JSON,
                'Content-Type': APPLICATION_JSON,
                'X-User-Agent': USER_AGENT,
                'Api-Key': API_KEY,
                'Authorization': `Bearer ${this.token!}`
            },
        });

        if (!response.ok) {
            console.log(response)
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        return result as ListSubtitlesResponse;
    }
}

type AsyncQuery<Request, Response> = (request: Request) => Promise<Response>

function cached<Request, Response>(query: AsyncQuery<Request, Response>) {
    return async function(request: Request): Promise<Response> {
        const key = JSON.stringify(request);
        const data = await chrome.storage.session.get(key);
        const cachedResponse = data[key] as Response | undefined;
        if (cachedResponse) {
            return cachedResponse;
        }
        const response = await query(request);
        let entry: Record<string, Response> = {};
        entry[key] = response;
        chrome.storage.session.set(entry);
        return response
    }
}

export function highestDownloadCountFirst(a: Subtitle, b: Subtitle) {
    return b.attributes.download_count - a.attributes.download_count
}

export function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K) {
    return list.reduce((previous, currentItem) => {
      const group = getKey(currentItem);
      if (!previous[group]) {
        previous[group] = [];
      }
      previous[group].push(currentItem);
      return previous;
    }, {} as Record<K, T[]>);
  };
