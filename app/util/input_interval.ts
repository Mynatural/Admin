
export class InputInterval<T> {
    constructor(private interval: number) { }

    _lastValue: T;
    _changing: Promise<void>

    async update(v: T, change: (v: T) => Promise<void>): Promise<void> {
        this._lastValue = v;
        if (this._changing) {
            await this._changing;
        }
        await new Promise((resolve, reject) => {
            setTimeout(resolve, this.interval);
        });
        if (_.isEqual(this._lastValue, v)) {
            this._changing = change(v);
            await this._changing;
        }
    }
}
