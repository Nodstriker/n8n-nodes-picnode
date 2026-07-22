import type { IExecuteFunctions, IHttpRequestMethods, IHttpRequestOptions } from 'n8n-workflow';

export async function picnodeApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IHttpRequestOptions['body'],
): Promise<unknown> {
	const credentials = await this.getCredentials('picnodeApi');
	const baseUrl = String(credentials.baseUrl).replace(/\/+$/, '');
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json: true,
		sendCredentialsOnCrossOriginRedirect: false,
	};

	if (body !== undefined) {
		options.body = body;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'picnodeApi', options);
}
