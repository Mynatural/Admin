import _ from "lodash";

import { Logger } from "./logging";

const logger = new Logger("EditableMap");

export class EditableMap<V> {
    constructor(private _src: {[key: string]: V}, private newValue: () => V) {
        this.list = _.map(_src, (v, k) => new EditableMapItem<V>(_src, k));
    }

    list: EditableMapItem<V>[];

    get src(): {[key: string]: V} {
        return this._src;
    }

    add() {
        const prefix = "new_key";
        var index = 0;
        const mkKey = () => index > 0 ? `${prefix}-${index}` : prefix;
        while (_.has(this.src, mkKey())) {
            index++;
        }
        const flag = new EditableMapItem<V>(this.src, mkKey());
        flag.value = this.newValue();
        this.list.push(flag);
    }

    remove(flag: EditableMapItem<V>) {
        delete this.src[flag.key];
        _.remove(this.list, (a) => _.isEqual(a.key, flag.key));
    }
}

export class EditableMapItem<V> {
    constructor(private src: {[key: string]: V}, private _key: string) {
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) {
            logger.debug(() => `This key is empty.`);
        } else if (_.has(this.src, v)) {
            logger.debug(() => `This key is duplicate: ${v}`);
        } else {
            const value = this.value;
            delete this.src[this._key];
            this._key = v;
            this.value = value;
        }
    }

    get value(): V {
        return this.src[this._key];
    }

    set value(v: V) {
        this.src[this._key] = v;
    }
}
