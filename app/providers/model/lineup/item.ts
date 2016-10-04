import {Injectable} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import {Illustration, createNewKey, itemDir, INFO_JSON} from "./lineup";
import {SpecGroup, Spec} from "./spec";
import {ItemMeasure} from "./measure";
import {S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Item");

export class ItemGroup {
    constructor(private illust: Illustration, public availables: Item[]) { }

    get(key: string): Item {
        return _.find(this.availables, {"key": key});
    }

    async remove(o: Item): Promise<void> {
        await this.illust.onRemoving.itemValue(o, async () => {
            _.remove(this.availables, (a) => _.isEqual(a.key, o.key));
        })
    }

    createNew(): Item {
        const key = createNewKey("new_created", (key) => _.find(this.availables, {"key": key}));
        const one = new Item(this.illust, key, {
            name: "新しいラインナップ",
            price: 500,
            description: "",
            specGroups: [],
            specs: [],
            measurements: []
        });
        this.availables.unshift(one);
        return one;
    }
}

export class Item {
    specGroups: SpecGroup[];
    measurements: ItemMeasure[];
    private _titleImage: CachedImage;
    private _images: {[key: string]: CachedImage}; // SpecSide -> CachedImage
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private illust: Illustration, private _key: string, public info: Info.Item) {
        logger.info(() => `${_key}: ${JSON.stringify(info, null, 4)}`);
        this.specGroups = _.map(info.specGroups, (spec) => new SpecGroup(illust, this, spec));
        this.measurements = _.map(info.measurements, (m) => new ItemMeasure(illust, this, m));
    }

    refreshIllustrations() {
        this.refreshTiteImage(true);
        this.refreshCurrentImages(true);
    }

    onChangeSpec() {
        this.refreshCurrentImages(true);
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.illust.onChanging.itemKey(this, async () => {
                logger.debug(() => `Changing lineup key: ${this._key} -> ${v}`);
                this._key = v;
            });
        });
    }

    private refreshTiteImage(clear = false): CachedImage {
        if (clear || _.isNil(this._titleImage)) {
            this._titleImage = this.illust.itemTitle(this);
        }
        return this._titleImage;
    }

    get titleImage(): SafeUrl {
        return this.refreshTiteImage().url;
    }

    async changeImage(file: File): Promise<void> {
        if (file) {
            const path = this.refreshTiteImage().listPath[0];
            await this.illust.s3image.s3.upload(path, file);
            this.refreshTiteImage(true);
        }
    }

    private refreshCurrentImages(clear = false): {[key: string]: CachedImage} {
        if (clear || _.isEmpty(this._images)) {
            this._images = this.illust.itemValueCurrent(this);
        }
        return this._images;
    }

    getImage(side: Info.SpecSide): SafeUrl {
        const safe = this.refreshCurrentImages()[side];
        return safe ? safe.url : null;
    }

    get totalPrice(): number {
        var result = this.info.price;
        _.forEach(this.specGroups, (spec, key) => {
            const v = spec.current;
            if (v) {
                result = result + v.info.price;
            }
        });
        return result;
    }

    async writeInfo(): Promise<void> {
        const path = `${itemDir(this.key)}/${INFO_JSON}`;
        await this.illust.s3image.s3.write(path, Base64.encodeJson(this.info));
    }

    getSpec(key: string): SpecGroup {
        return _.find(this.specGroups, (s) => _.isEqual(s.info.key, key));
    }

    async removeSpec(o: SpecGroup): Promise<void> {
        await this.illust.onRemoving.specGroup(o, async () => {
            _.remove(this.specGroups, (a) => _.isEqual(a.info.key, o.info.key));
            _.remove(this.info.specGroups, (a) => _.isEqual(a.key, o.info.key));
        });
    }

    createSpec(): SpecGroup {
        const key = createNewKey("new_spec", (key) => this.getSpec(key));
        const one = new SpecGroup(this.illust, this, {
            name: "新しい仕様",
            key: key,
            side: "FRONT",
            value: {
                initial: "",
                availables: []
            }
        });
        const initial = one.createNew();
        one.info.value.initial = initial.info.key;
        this.specGroups.unshift(one);
        this.info.specGroups.unshift(one.info);
        return one;
    }
}
