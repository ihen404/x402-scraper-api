export interface X402ClientOptions {
    endpoint: string;
    apiKey?: string;
    paymentSigner?: any;
}
export declare class X402ScraperClient {
    private endpoint;
    private apiKey?;
    constructor(options: X402ClientOptions);
    scrape(url: string, paymentProof?: string): Promise<string>;
}
