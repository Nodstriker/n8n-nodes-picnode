import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PicnodeApi implements ICredentialType {
	name = 'picnodeApi';

	displayName = 'Picnode API';

	icon = {
		light: 'file:../nodes/Picnode/picnode.svg',
		dark: 'file:../nodes/Picnode/picnode.dark.svg',
	} as const;

	documentationUrl = 'https://github.com/Nodstriker/n8n-nodes-picnode#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://picnode.nodstrike.com',
			placeholder: 'https://picnode.example.com',
			required: true,
			description: 'Root URL of the Picnode server, without a trailing slash',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/files',
			method: 'GET',
		},
	};
}
