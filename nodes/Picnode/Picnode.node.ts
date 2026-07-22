/* eslint-disable @n8n/community-nodes/node-usable-as-tool, n8n-nodes-base/node-execute-block-wrong-error-thrown -- Picnode uploads require binary data, and the class must load before n8n's runtime modules are resolvable in isolated Docker community-package directories. */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { picnodeApiRequest } from './GenericFunctions';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function rethrow(error: unknown): never {
	if (error instanceof Error) throw error;
	throw new Error(String(error));
}

export class Picnode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Picnode',
		name: 'picnode',
		icon: { light: 'file:picnode.svg', dark: 'file:picnode.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Temporarily host images and videos with Picnode',
		defaults: {
			name: 'Picnode',
		},
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		credentials: [
			{
				name: 'picnodeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'file',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a binary image or video for temporary hosting',
						action: 'Upload a file',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List active files',
						action: 'List files',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a hosted file before it expires',
						action: 'Delete a file',
					},
				],
				default: 'upload',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['upload'],
					},
				},
				description: 'Name of the input binary field containing the image or video',
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['delete'],
					},
				},
				description: 'ID returned by the Upload or List operation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'list') {
			try {
				const response = (await picnodeApiRequest.call(this, 'GET', '/api/files')) as {
					files?: IDataObject[];
				};

				if (!Array.isArray(response.files)) {
					throw new Error('Picnode returned an invalid file list');
				}

				return [
					response.files.map((file) => ({
						json: file,
						pairedItem: { item: 0 },
					})),
				];
			} catch (error) {
				if (this.continueOnFail()) {
					return [[{ json: { error: errorMessage(error) }, pairedItem: { item: 0 } }]];
				}

				rethrow(error);
			}
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				if (operation === 'upload') {
					const binaryPropertyName = this.getNodeParameter(
						'binaryPropertyName',
						itemIndex,
					) as string;
					const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

					if (!binaryData.mimeType) {
						throw new Error('The binary file has no MIME type');
					}

					const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
					const form = new FormData();
					const file = new Blob([new Uint8Array(buffer)], { type: binaryData.mimeType });
					form.append('file', file, binaryData.fileName ?? 'upload');

					const response = (await picnodeApiRequest.call(
						this,
						'POST',
						'/api/files',
						form,
					)) as IDataObject;

					returnData.push({
						json: response,
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'delete') {
					const fileId = (this.getNodeParameter('fileId', itemIndex) as string).trim();

					if (fileId.length === 0) {
						throw new Error('File ID must not be empty');
					}

					const response = (await picnodeApiRequest.call(
						this,
						'DELETE',
						`/api/files/${encodeURIComponent(fileId)}`,
					)) as IDataObject;

					returnData.push({
						json: response,
						pairedItem: { item: itemIndex },
					});
				} else {
					throw new Error(`Unsupported operation: ${operation}`);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: errorMessage(error) },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				rethrow(error);
			}
		}

		return [returnData];
	}
}
