import { Emitter } from './emitter';

describe(`Emitter`, () => {
	test(`should emit values`, () => {
		const emitter = new Emitter<number>();

		const values: number[] = [];
		emitter.subscribe((v) => values.push(v)); // function
		emitter.subscribe({ next: (v) => values.push(v * 2) }); // subscriber object
		expect(values).toEqual([]);

		emitter.emit(2);

		expect(values).toEqual([2, 4]);
	});

	test(`should not emit values to unsubscribed subscribers`, () => {
		const emitter = new Emitter<number>();

		const values: number[] = [];
		emitter.subscribe((v) => values.push(v));
		const unsub = emitter.subscribe((v) => values.push(v * 2));
		expect(values).toEqual([]);

		emitter.emit(2);
		expect(values).toEqual([2, 4]);

		unsub.unsubscribe();
		emitter.emit(10);
		expect(values).toEqual([2, 4, 10]);
	});

	test(`should ignore nullable values`, () => {
		const emitter = new Emitter<number>();

		const values: number[] = [];
		emitter.subscribe((v) => values.push(v));
		emitter.subscribe((v) => values.push(v * 2));
		expect(values).toEqual([]);

		emitter.emit(2);

		expect(values).toEqual([2, 4]);
	});
});
