import jsonServer from 'json-server';
import fs from 'fs';

const EMPTY_DATABASE = {
    'categories': [],
    'machinery': [],
    'roles': [],
    'user-accounts': [],
    'organizations': [],
    'profiles': [],
    'rentals': [],
    'maintenances': [],
    'service-operations': []
};

export class MockApiServer {
    #config;
    #app;

    constructor(config) {
        this.#config = config;
        this.#ensureDatabaseFile();
        this.#app = this.#buildApp();
    }

    start() {
        this.#app.listen(this.#config.port, () => {
            console.log(`MaquiControl Mock API running on http://localhost:${this.#config.port}`);
        });
    }

    #ensureDatabaseFile() {
        if (!fs.existsSync(this.#config.dbPath)) {
            fs.writeFileSync(this.#config.dbPath, JSON.stringify(EMPTY_DATABASE, null, 2));
        }
    }

    #buildApp() {
        const app = jsonServer.create();
        const router = jsonServer.router(this.#config.dbPath);

        app.get('/', (_req, res) => res.json({resources: Object.keys(this.#resourceState(router))}));
        app.use(jsonServer.defaults());
        app.use(jsonServer.bodyParser);
        app.get('/api/v1/health', (_req, res) => res.json({status: 'ok', time: new Date().toISOString()}));
        // Same rewrites as server/routes.json in MaquiControl-Frontend: sign-up creates a user account.
        app.use(jsonServer.rewriter({
            '/api/v1/authentication/sign-up': '/user-accounts',
            '/api/v1/*': '/$1',
            '/api/v1': '/'
        }));
        app.use(router);

        return app;
    }

    #resourceState(router) {
        return typeof router.db.getState === 'function' ? router.db.getState() : router.db.data;
    }
}
