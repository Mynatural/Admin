import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import {Illustration, createNewKey} from "./lineup";
import {ItemGroup, Item} from "./item";
import {SpecGroup, Spec} from "./spec";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("LineupSpecDeriv");

export class DerivGroup {
    availables: Deriv[];
    private _current: Deriv;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private illust: Illustration, public spec: Spec, public info: Info.DerivGroup) {
        this.availables = _.map(info.value.availables, (a) => {
            return new Deriv(illust, this, a);
        });
        this.current = _.find(this.availables, (a) => _.isEqual(a.info.key, info.value.initial));
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.illust.onChanging.derivGroupKey(this, async () => {
                logger.debug(() => `Changing lineup key: ${this.info.key} -> ${v}`);
                this.info.key = v;
            });
        });
    }

    get current(): Deriv {
        return this._current;
    }

    set current(v: Deriv) {
        this.spec.onChangeDeriv();
        this._current = v;
    }

    get(key: string): Deriv {
        return _.find(this.availables, (a) => _.isEqual(key, a.info.key));
    }

    async remove(o: Deriv): Promise<void> {
        await this.illust.onRemoving.deriv(o, async () => {
            _.remove(this.availables, (a) => _.isEqual(a.info.key, o.info.key));
            _.remove(this.info.value.availables, (a) => _.isEqual(a.key, o.info.key));
            if (_.isEqual(this.info.value.initial, o.info.key)) {
                this.info.value.initial = _.head(this.availables).info.key;
            }
        });
    }

    createNew(): Deriv {
        const key = createNewKey("new_deriv_value", (key) => this.get(key));
        const one = new Deriv(this.illust, this, {
            name: "新しい派生の値",
            key: key,
            description: ""
        });
        this.availables.unshift(one);
        this.info.value.availables.unshift(one.info);
        return one;
    }
}

export class Deriv {
    private _image: CachedImage;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private illust: Illustration, public derivGroup: DerivGroup, public info: Info.Deriv) {
    }

    refreshIllustrations() {
        this.refreshImage(true);
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.illust.onChanging.derivKey(this, async () => {
                logger.debug(() => `Changing lineup key: ${this.info.key} -> ${v}`);
                this.info.key = v;
            });
        });
    }

    private refreshImage(clear = false): CachedImage {
        if (clear || _.isNil(this._image)) {
            this._image = this.illust.deriv(this);
        }
        return this._image;
    }

    get image(): SafeUrl {
        return this.refreshImage().url;
    }
}
