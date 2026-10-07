export class MockApiServerConfig {
    #port;
    #dbPath;

    constructor({port, dbPath}) {
        this.#port = Number(port);
        this.#dbPath = dbPath;
    }

    get port() {
        return this.#port;
    }

    get dbPath() {
        return this.#dbPath;
    }
}
