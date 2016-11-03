import _ from "lodash";

import { Logger } from "./logging";

const logger = new Logger("ItemFlags");

export class ItemFlags {
    constructor(private src: {[key: string]: string}) {
        this.list = _.map(src, (v, k) => new ItemFlag(src, k));
    }

    list: ItemFlag[];

    add() {
        const prefix = "new_flag";
        var index = 0;
        const mkName = () => index > 0 ? `${prefix}-${index}` : prefix;
        while (_.has(this.src, mkName())) {
            index++;
        }
        const flag = new ItemFlag(this.src, mkName());
        flag.value = "new_value";
        this.list.push(flag);
    }

    remove(flag: ItemFlag) {
        delete this.src[flag.name];
        _.remove(this.list, (a) => _.isEqual(a.name, flag.name));
    }
}

export class ItemFlag {
    constructor(private src: {[key: string]: string}, private _name: string) {
    }

    get name(): string {
        return this._name;
    }

    set name(v: string) {
        if (_.isEmpty(v)) {
            logger.debug(() => `This key is empty.`);
        } else if (_.has(this.src, v)) {
            logger.debug(() => `This key is duplicate: ${v}`);
        } else {
            const value = this.value;
            delete this.src[this._name];
            this._name = v;
            this.value = value;
        }
    }

    get value(): string {
        return this.src[this._name];
    }

    set value(v: string) {
        this.src[this._name] = v;
    }
}
