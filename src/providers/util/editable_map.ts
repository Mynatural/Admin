import _ from "lodash";

import { reorderArray } from 'ionic-angular';

import { Logger } from "./logging";

const logger = new Logger("EditableMap");

export class EditableMap<V> {
    constructor(src: {[key: string]: V}, private newValue: () => V) {
        this.list = _.map(src, (v, k) => new EditableMapItem<V>(this, k, v));
    }

    list: EditableMapItem<V>[];

    toObject(): {[key: string]: V} {
        return _.fromPairs(_.map(this.list, (x) => [x.key, x.value]));
    }

    private getItem(key: string): EditableMapItem<V> | null {
        return _.find(this.list, (x) => _.isEqual(x.key, key));
    }

    get(key: string): V | null {
        const item = this.getItem(key);
        if (item) {
            return item.value;
        } else {
            return null;
        }
    }

    has(key: string): boolean {
        return !_.isNil(this.getItem(key));
    }

    add() {
        const prefix = "new_key";
        var index = 0;
        const mkKey = () => index > 0 ? `${prefix}-${index}` : prefix;
        while (this.has(mkKey())) {
            index++;
        }
        const flag = new EditableMapItem<V>(this, mkKey(), this.newValue());
        this.list.push(flag);
    }

    remove(flag: EditableMapItem<V>) {
        _.remove(this.list, (a) => _.isEqual(a.key, flag.key));
    }

    reorder(indexes) {
        this.list = reorderArray(this.list, indexes);
    }
}

export class EditableMapItem<V> {
    constructor(private parent: EditableMap<V>, private _key: string, private _value: V) {
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) {
            logger.debug(() => `This key is empty.`);
        } else if (this.parent.has(v)) {
            logger.debug(() => `This key is duplicate: ${v}`);
        } else {
            this._key = v;
        }
    }

    get value(): V {
        return this._value;
    }

    set value(v: V) {
        this._value = v;
    }
}
