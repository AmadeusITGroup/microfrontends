import { Message } from '@amadeus-it-group/microfrontends';

export interface TestMessage_1_0 extends Message {
	type: 'test';
	version: '1.0';
	data: string;
}

export interface TestMessage_2_0 extends Message {
	type: 'test';
	version: '2.0';
	data: string[];
}

export type MyMessage = TestMessage_1_0 | TestMessage_2_0;
