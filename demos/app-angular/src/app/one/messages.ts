import { Message } from '@amadeus-it-group/microfrontends';

export type MyMessage = ResizeMessage;

export interface Resize_1_1 extends Message {
	type: 'resize';
	version: '1.1';
	height: number;
}

export type ResizeMessage = Resize_1_1;
