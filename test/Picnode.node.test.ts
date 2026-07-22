import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
// Test-only dependency; it is not included in the published package.
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { describe, expect, it, vi } from 'vitest';

import { PicnodeApi } from '../credentials/PicnodeApi.credentials';
import { Picnode } from '../nodes/Picnode/Picnode.node';

const testNode: INode = {
	id: '4e568e84-52bd-4f50-9872-31fe8eb2b191',
	name: 'Picnode',
	type: 'n8n-nodes-picnode.picnode',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

interface ContextOptions {
	operation: 'upload' | 'list' | 'delete';
	items?: INodeExecutionData[];
	response?: unknown;
	requestError?: Error;
	continueOnFail?: boolean;
	fileId?: string;
}

function createContext(options: ContextOptions) {
	const items = options.items ?? [{ json: {} }];
	const requests: IHttpRequestOptions[] = [];
	const request = vi.fn(async (_credentialType: string, requestOptions: IHttpRequestOptions) => {
		requests.push(requestOptions);
		if (options.requestError) throw options.requestError;
		return options.response;
	});

	const context = {
		getInputData: () => items,
		getNode: () => testNode,
		getCredentials: async () => ({
			baseUrl: 'https://picnode.nodstrike.com///',
			apiKey: 'not-returned-to-output',
		}),
		getNodeParameter: (name: string) => {
			if (name === 'resource') return 'file';
			if (name === 'operation') return options.operation;
			if (name === 'binaryPropertyName') return 'data';
			if (name === 'fileId') return options.fileId ?? '';
			throw new Error(`Unknown parameter: ${name}`);
		},
		continueOnFail: () => options.continueOnFail ?? false,
		helpers: {
			httpRequestWithAuthentication: request,
			assertBinaryData: (itemIndex: number, propertyName: string): IBinaryData => {
				const binary = items[itemIndex]?.binary?.[propertyName];
				if (!binary) {
					throw new NodeOperationError(testNode, `Missing binary field: ${propertyName}`, {
						itemIndex,
					});
				}
				return binary;
			},
			getBinaryDataBuffer: async (itemIndex: number, propertyName: string) =>
				Buffer.from(items[itemIndex].binary?.[propertyName].data ?? '', 'base64'),
		},
	} as unknown as IExecuteFunctions;

	return { context, requests, request };
}

describe('Picnode node', () => {
	it('declares main connections without a runtime enum dependency', () => {
		const node = new Picnode();

		expect(node.description.inputs).toEqual(['main']);
		expect(node.description.outputs).toEqual(['main']);
	});

	it('uploads each binary item as multipart form data', async () => {
		const bytes = Buffer.from('image-content');
		const { context, requests, request } = createContext({
			operation: 'upload',
			items: [
				{
					json: { source: 'generator' },
					binary: {
						data: {
							data: bytes.toString('base64'),
							mimeType: 'image/png',
							fileName: 'generated.png',
						},
					},
				},
			],
			response: { id: '01TEST', direct_url: 'https://picnode.nodstrike.com/f/01TEST.png' },
		});

		const result = await new Picnode().execute.call(context);

		expect(request).toHaveBeenCalledWith('picnodeApi', expect.any(Object));
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toBe('https://picnode.nodstrike.com/api/files');
		expect(requests[0].body).toBeInstanceOf(FormData);
		const uploaded = (requests[0].body as FormData).get('file') as Blob & { name: string };
		expect(uploaded.name).toBe('generated.png');
		expect(uploaded.type).toBe('image/png');
		expect(Buffer.from(await uploaded.arrayBuffer())).toEqual(bytes);
		expect(result[0][0]).toEqual({
			json: { id: '01TEST', direct_url: 'https://picnode.nodstrike.com/f/01TEST.png' },
			pairedItem: { item: 0 },
		});
	});

	it('returns one n8n item per listed file', async () => {
		const files: IDataObject[] = [
			{ id: '01FIRST', direct_url: 'https://example.com/first.png' },
			{ id: '01SECOND', direct_url: 'https://example.com/second.png' },
		];
		const { context, requests } = createContext({ operation: 'list', response: { files } });

		const result = await new Picnode().execute.call(context);

		expect(requests[0]).toMatchObject({
			method: 'GET',
			url: 'https://picnode.nodstrike.com/api/files',
		});
		expect(result[0]).toEqual([
			{ json: files[0], pairedItem: { item: 0 } },
			{ json: files[1], pairedItem: { item: 0 } },
		]);
	});

	it('URL-encodes the file ID when deleting', async () => {
		const { context, requests } = createContext({
			operation: 'delete',
			fileId: 'id/with spaces',
			response: { id: 'id/with spaces', deleted: true },
		});

		const result = await new Picnode().execute.call(context);

		expect(requests[0]).toMatchObject({
			method: 'DELETE',
			url: 'https://picnode.nodstrike.com/api/files/id%2Fwith%20spaces',
		});
		expect(result[0][0].json).toEqual({ id: 'id/with spaces', deleted: true });
	});

	it('rejects an invalid list response', async () => {
		const { context } = createContext({ operation: 'list', response: { unexpected: true } });

		await expect(new Picnode().execute.call(context)).rejects.toBeInstanceOf(NodeOperationError);
	});

	it('returns an error item when Continue On Fail is enabled', async () => {
		const { context } = createContext({
			operation: 'delete',
			fileId: '01TEST',
			requestError: new Error('Rate limit exceeded'),
			continueOnFail: true,
		});

		const result = await new Picnode().execute.call(context);

		expect(result[0][0]).toEqual({
			json: { error: 'Rate limit exceeded' },
			pairedItem: { item: 0 },
		});
	});
});

describe('Picnode credential', () => {
	it('stores the API key as a password and injects X-API-Key', () => {
		const credential = new PicnodeApi();
		const apiKey = credential.properties.find((property) => property.name === 'apiKey');

		expect(apiKey?.typeOptions?.password).toBe(true);
		expect(credential.authenticate.properties).toEqual({
			headers: { 'X-API-Key': '={{$credentials.apiKey}}' },
		});
		expect(credential.test.request.url).toBe('/api/files');
	});
});
