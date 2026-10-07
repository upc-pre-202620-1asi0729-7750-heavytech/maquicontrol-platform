const MERCADO_PAGO_API_URL = 'https://api.mercadopago.com';

/**
 * Talks to Mercado Pago with the account's Access Token, which is secret:
 * it lives only here, read from the MERCADO_PAGO_ACCESS_TOKEN environment
 * variable (Azure App Service > Environment variables), never in the frontend.
 */
export class MercadoPagoGateway {
    #accessToken;

    constructor(accessToken) {
        this.#accessToken = accessToken;
    }

    get configured() {
        return Boolean(this.#accessToken);
    }

    /** Creates a Checkout Pro preference: the page where the buyer pays. */
    async createCheckoutPreference({title, unitPrice, currencyId, externalReference, backUrl}) {
        const preference = {
            items: [{id: externalReference, title, quantity: 1, unit_price: unitPrice, currency_id: currencyId}],
            external_reference: externalReference,
            back_urls: {success: backUrl, failure: backUrl, pending: backUrl},
            // Mercado Pago only redirects automatically to HTTPS back URLs;
            // on localhost the buyer returns with the "Volver al sitio" button.
            ...(backUrl.startsWith('https://') ? {auto_return: 'approved'} : {})
        };
        const created = await this.#request('/checkout/preferences', {method: 'POST', body: JSON.stringify(preference)});
        return {id: created.id, initPoint: created.init_point, sandboxInitPoint: created.sandbox_init_point};
    }

    /** Reads a payment so its status is confirmed by Mercado Pago, not by the return URL. */
    async getPayment(paymentId) {
        const payment = await this.#request(`/v1/payments/${encodeURIComponent(paymentId)}`, {method: 'GET'});
        return {
            id: payment.id,
            status: payment.status,
            externalReference: payment.external_reference,
            transactionAmount: payment.transaction_amount,
            currencyId: payment.currency_id,
            dateApproved: payment.date_approved
        };
    }

    async #request(path, init) {
        const response = await fetch(`${MERCADO_PAGO_API_URL}${path}`, {
            ...init,
            headers: {'Authorization': `Bearer ${this.#accessToken}`, 'Content-Type': 'application/json'}
        });
        const text = await response.text();
        let body;
        try {
            body = JSON.parse(text);
        } catch {
            body = {message: text.slice(0, 200)};
        }
        if (!response.ok) {
            const error = new Error(body.message || `Mercado Pago responded ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return body;
    }
}
