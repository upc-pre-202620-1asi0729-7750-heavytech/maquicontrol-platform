import jsonServer from 'json-server';
import fs from 'fs';
import {MercadoPagoGateway} from './mercado-pago-gateway.js';

const EMPTY_DATABASE = {
    'categories': [],
    'machinery': [],
    'roles': [],
    'user-accounts': [],
    'organizations': [],
    'profiles': [],
    'rentals': [],
    'maintenances': [],
    'service-operations': [],
    'plans': [],
    'subscriptions': []
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
        this.#addPaymentRoutes(app);
        // Same rewrites as server/routes.json in MaquiControl-Frontend: sign-up creates a user account.
        app.use(jsonServer.rewriter({
            '/api/v1/authentication/sign-up': '/user-accounts',
            '/api/v1/*': '/$1',
            '/api/v1': '/'
        }));
        app.use(router);

        return app;
    }

    /** Mercado Pago (sandbox) payments: registered before the json-server router. */
    #addPaymentRoutes(app) {
        const gateway = new MercadoPagoGateway(process.env.MERCADO_PAGO_ACCESS_TOKEN);
        const ensureConfigured = (_req, res, next) => gateway.configured
            ? next()
            : res.status(503).json({message: 'MERCADO_PAGO_ACCESS_TOKEN is not configured.'});
        const fail = (res, error) => res.status(error.status || 502).json({message: error.message});

        app.post('/api/v1/payments/checkout-preferences', ensureConfigured, async (req, res) => {
            const {title, unitPrice, currencyId, externalReference, backUrl} = req.body ?? {};
            if (!title || !(Number(unitPrice) > 0) || !currencyId || !externalReference || !backUrl) {
                return res.status(400).json({message: 'title, unitPrice, currencyId, externalReference and backUrl are required.'});
            }
            try {
                res.status(201).json(await gateway.createCheckoutPreference({
                    title, unitPrice: Number(unitPrice), currencyId, externalReference: String(externalReference), backUrl
                }));
            } catch (error) {
                fail(res, error);
            }
        });

        app.get('/api/v1/payments/:paymentId', ensureConfigured, async (req, res) => {
            try {
                res.json(await gateway.getPayment(req.params.paymentId));
            } catch (error) {
                fail(res, error);
            }
        });
    }

    #resourceState(router) {
        return typeof router.db.getState === 'function' ? router.db.getState() : router.db.data;
    }
}
