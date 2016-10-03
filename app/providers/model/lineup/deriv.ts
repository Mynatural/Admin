import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import * as Util from "./_util";
import {Lineup, LineupValue} from "./lineup";
import {ItemSpec, ItemSpecValue} from "./spec";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("LineupSpecDeriv");

export class ItemSpecDeriv {
    availables: ItemSpecDerivValue[];
    private _current: ItemSpecDerivValue;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private s3image: S3Image, public specValue: ItemSpecValue, public info: Info.SpecDeriv) {
        this.availables = _.map(info.value.availables, (a) => {
            return new ItemSpecDerivValue(s3image, this, a);
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

    get current(): ItemSpecDerivValue {
        return this._current;
    }

    set current(v: ItemSpecDerivValue) {
        this.specValue.onChangeDeriv();
        this._current = v;
    }

    get(key: string): ItemSpecDerivValue {
        return _.find(this.availables, (a) => _.isEqual(key, a.info.key));
    }

    remove(o: ItemSpecDerivValue) {
        if (_.size(this.availables) > 1) {
            _.remove(this.availables, (a) => _.isEqual(a.info.key, o.info.key));
            _.remove(this.info.value.availables, (a) => _.isEqual(a.key, o.info.key));
            if (_.isEqual(this.info.value.initial, o.info.key)) {
                this.info.value.initial = _.head(this.availables).info.key;
            }
        }
    }

    createNew(): ItemSpecDerivValue {
        const key = Util.createNewKey("new_deriv_value", (key) => this.get(key));
        const one = new ItemSpecDerivValue(this.s3image, this, {
            name: "新しい派生の値",
            key: key,
            description: ""
        });
        this.availables.unshift(one);
        this.info.value.availables.unshift(one.info);
        return one;
    }
}

export class ItemSpecDerivValue {
    private _image: CachedImage;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private s3image: S3Image, public deriv: ItemSpecDeriv, public info: Info.SpecDerivValue) {
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

    get image(): SafeUrl {
        const sv = this.deriv.specValue;
        const list = _.flatMap([Util.ROOT, sv.spec.item.dir], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${Util.SPEC_VALUE}/${sv.spec.info.key}/derives/${sv.info.key}/${this.info.key}/illustration.${sux}`));
        if (_.isNil(this._image) || !this._image.isSamePath(list)) {
            this._image = this.s3image.createCache(list);
        }
        return this._image.url;
    }
}
