import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import {Lineup, LineupValue} from "./lineup";
import {ItemSpecDeriv, ItemSpecDerivValue} from "./deriv";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("LineupSpec");

const ROOT = "unauthorized";
const LINEUP = "lineup";
const SPEC_VALUE = "spec-value";
const INFO_JSON = "info.json.encoded";

function createNewKey(prefix: string, find: (v: string) => any): string {
    var index = 0;
    var key;
    while (_.isNil(key) || !_.isNil(find(key))) {
        key = `${prefix}_${index++}`;
    }
    return key;
}

export class ItemSpec {
    availables: ItemSpecValue[];
    private _current: ItemSpecValue;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private s3image: S3Image, public item: LineupValue, public info: Info.Spec) {
        this.availables = _.map(info.value.availables, (key) => {
            const v = _.find(item.info.specValues, {"key": key});
            return new ItemSpecValue(s3image, this, v);
        });
        this.current = _.find(this.availables, (a) => _.isEqual(a.info.key, info.value.initial));
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            logger.debug(() => `Changing lineup key: ${this.info.key} -> ${v}`);
            this.info.key = v;
        });
    }

    get current(): ItemSpecValue {
        return this._current;
    }

    set current(v: ItemSpecValue) {
        this.item.onChangeSpecValue();
        this._current = v;
    }

    get(key: string) {
        return  _.find(this.availables, (a) => _.isEqual(key, a.info.key));
    }

    remove(o: ItemSpecValue) {
        if (_.size(this.availables) > 1) {
            _.remove(this.availables, (a) => _.isEqual(a.info.key, o.info.key));
            _.remove(this.info.value.availables, (a) => _.isEqual(a, o.info.key));
            if (_.isEqual(this.info.value.initial, o.info.key)) {
                this.info.value.initial = _.head(this.availables).info.key;
            }
        }
    }

    createNew() {
        const key = createNewKey("new_value", (key) => this.get(key));
        const one = new ItemSpecValue(this.s3image, this, {
            name: "新しい仕様の値",
            key: key,
            description: "",
            derives: [],
            price: 100
        });
        this.availables.unshift(one);
        this.item.info.specValues.unshift(one.info);
        this.info.value.availables.unshift(one.info.key);
        return one;
    }
}

export class ItemSpecValue {
    derives: ItemSpecDeriv[];
    private _image: CachedImage;
    private _dir: string;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private s3image: S3Image, public spec: ItemSpec, public info: Info.SpecValue) {
        this.derives = _.map(info.derives, (o) => new ItemSpecDeriv(s3image, this, o));
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            logger.debug(() => `Changing lineup key: ${this.info.key} -> ${v}`);
            this.info.key = v;
        });
    }

    onChangingKey(permit: (v: boolean) => Promise<void>) {
        this.spec.item.onChangingKey(async (v) => {

        });
    }

    onChangeDeriv() {
        this._dir = null;
        this.spec.item.onChangeSpecValue();
    }

    get dir(): string {
        if (_.isNil(this._dir)) {
            const keys = _.map(this.derives, (v) => v.current.info.key);
            logger.debug(() => `Building dir from keys: ${keys}`);
            this._dir = `${this.info.key}/${_.join(keys, "/")}`
        }
        return this._dir;
    }

    get image(): SafeUrl {
        const list = _.flatMap([ROOT, this.spec.item.dir], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${this.spec.info.key}/images/${this.dir}/illustration.${sux}`));
        if (_.isNil(this._image) || !this._image.isSamePath(list)) {
            this._image = this.s3image.createCache(list);
        }
        return this._image.url;
    }

    getDeriv(key: string): ItemSpecDeriv {
        return _.find(this.derives, (a) => _.isEqual(key, a.info.key));
    }

    removeDeriv(o: ItemSpecDeriv) {
        _.remove(this.derives, (a) => _.isEqual(a.info.key, o.info.key));
        _.remove(this.info.derives, (a) => _.isEqual(a.key, o.info.key));
    }

    createDeriv(): ItemSpecDeriv {
        const key = createNewKey("new_deriv", (key) => this.getDeriv(key));
        const one = new ItemSpecDeriv(this.s3image, this, {
            name: "新しい派生",
            key: key,
            value: {
                initial: "",
                availables: []
            }
        });
        const initial = one.createNew();
        one.info.value.initial = initial.info.key;
        this.derives.unshift(one);
        this.info.derives.unshift(one.info);
        return one;
    }
}
