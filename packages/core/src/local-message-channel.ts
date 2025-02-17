/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Simple MessagePort implementation
 */
export class LocalMessagePort extends EventTarget implements MessagePort {
	public otherPort: MessagePort | null = null;

	public onmessage: ((this: MessagePort, ev: MessageEvent) => any) | null = null;
	public onmessageerror: ((this: MessagePort, ev: MessageEvent) => any) | null = null;

	public postMessage(message: any): void {
		const event = new MessageEvent('message', { data: structuredClone(message) });
		this.otherPort?.dispatchEvent(event);
		this.otherPort?.onmessage?.call(this.otherPort, event);
	}

	public start(): void {
		// no need to implement
	}

	public close(): void {
		// no need to implement
	}
}

/**
 * Simple MessageChannel implementation
 */
export class LocalMessageChannel implements MessageChannel {
	public readonly port1: LocalMessagePort;
	public readonly port2: LocalMessagePort;

	constructor() {
		this.port1 = new LocalMessagePort();
		this.port2 = new LocalMessagePort();
		this.port1.otherPort = this.port2;
		this.port2.otherPort = this.port1;
	}
}
