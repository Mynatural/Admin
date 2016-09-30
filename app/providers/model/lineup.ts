import {Injectable} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./lineup_info.d";
import {S3File, S3Image} from "../aws/s3file";
import * as Base64 from "../../util/base64";
import {Logger} from "../../util/logging";

const logger = new Logger("Lineup");

const ROOT = "unauthorized";
const LINEUP = "lineup";
const SPEC_VALUE = "spec-value";

@Injectable()
export class Lineup {
    private cim: CachedImageMaker;
    all: Promise<Item[]>;

    constructor(private s3: S3File, private s3image: S3Image) {
        this.all = this.getAll();
        this.cim = new CachedImageMaker(s3image);
    }

    private async getAll(): Promise<Item[]> {
        const rootDir = `${ROOT}/${LINEUP}/`
        const finds = await this.s3.list(rootDir);
        const keys = _.filter(finds.map((path) => {
            if (path.endsWith("/")) {
                const name = path.substring(rootDir.length, path.length - 1);
                const l = _.split(name, "/");
                if (l.length === 1) {
                    return l[0];
                }
            }
            return null;
        }));
        const list = keys.map(async (key) => {
            try {
                return await this.load(key);
            } catch (ex) {
                logger.warn(() => `Failed to load '${key}': ${ex}`);
                return null;
            }
        });
        return _.filter(await Promise.all(list));
    }

    private async load(key: string): Promise<Item> {
        const text = await this.s3.read(`${ROOT}/${LINEUP}/${key}/info.json.encoded`);
        const info = Base64.decodeJson(text) as Info.Lineup;
        return new Item(this.s3, this.cim, key, info);
    }

    async get(key: string): Promise<Item> {
        const lineup = _.find(await this.all, {"key": key});
        return lineup.renew();
    }
}

export class Item {
    specs: ItemSpec[];
    measurements: ItemMeas[];
    private _titleImage: CachedImage;
    private _images: {[key: string]: CachedImage} = {};

    constructor(private s3: S3File, private cim: CachedImageMaker, public key: string, public info: Info.Lineup) {
        logger.info(() => `${key}: ${JSON.stringify(info, null, 4)}`);
        this.specs = _.map(info.specs, (spec) => new ItemSpec(cim, this, spec));
        this.measurements = _.map(info.measurements, (m) => new ItemMeas(cim, this, m));
    }

    renew(): Item {
        return new Item(this.s3, this.cim, this.dir, this.info);
    }

    onChangeSpecValue() {
        this._images = {};
    }

    get dir(): string {
        return `${ROOT}/${LINEUP}/${this.key}`
    }

    get name(): string {
        return this.info.name;
    }

    get titleImage(): SafeUrl {
        if (_.isNil(this._titleImage)) {
            this._titleImage = this.cim.create([`${this.dir}/title.png`]);
        }
        return this._titleImage.url;
    }

    private refreshImages(): {[key: string]: CachedImage} {
        if (_.isEmpty(this._images)) {
            const names = _.map(this.specs, (spec) => spec.current.dir);
            const dir = `${this.dir}/images/${_.join(names, "/")}/`;
            const list = ["FRONT", "BACK"];
            _.forEach(list, (side) => {
                const path = `${dir}/${side}.png`;
                this._images[side] = this.cim.create([path]);
            });
        }
        return this._images;
    }

    getImage(side: Info.SpecSide): SafeUrl {
        const safe = this.refreshImages()[side];
        return safe ? safe.url : null;
    }

    get totalPrice(): number {
        var result = this.info.price;
        _.forEach(this.specs, (spec, key) => {
            const v = spec.current;
            if (v) {
                result = result + v.info.price;
            }
        });
        return result;
    }

    getSpec(key: string): ItemSpec {
        return _.find(this.specs, (s) => _.isEqual(s.info.key, key));
    }
}

export class ItemSpec {
    availables: ItemSpecValue[];
    private _current: ItemSpecValue;

    constructor(private cim: CachedImageMaker, public item: Item, public info: Info.Spec) {
        this.availables = _.map(info.value.availables, (key) => {
            const v = _.find(item.info.specValues, {"key": key});
            return new ItemSpecValue(cim, this, v);
        });
        this.current = _.find(this.availables, (a) => _.isEqual(a.info.key, info.value.initial));
    }

    get current(): ItemSpecValue {
        return this._current;
    }

    set current(v: ItemSpecValue) {
        this.item.onChangeSpecValue();
        this._current = v;
    }
}

export class ItemSpecValue {
    derives: ItemSpecDeriv[];
    private _image: CachedImage;
    private _dir: string;

    constructor(private cim: CachedImageMaker, public spec: ItemSpec, public info: Info.SpecValue) {
        this.derives = _.map(info.derives, (o) => new ItemSpecDeriv(cim, this, o));
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
            this._image = this.cim.create(list);
        }
        return this._image.url;
    }
}

export class ItemSpecDeriv {
    availables: ItemSpecDerivValue[];
    private _current: ItemSpecDerivValue;

    constructor(private cim: CachedImageMaker, public specValue: ItemSpecValue, public info: Info.SpecDeriv) {
        this.availables = _.map(info.value.availables, (a) => {
            return new ItemSpecDerivValue(cim, this, a);
        });
        this.current = _.find(this.availables, (a) => _.isEqual(a.info.key, info.value.initial));
    }

    get current(): ItemSpecDerivValue {
        return this._current;
    }

    set current(v: ItemSpecDerivValue) {
        this.specValue.onChangeDeriv();
        this._current = v;
    }
}

export class ItemSpecDerivValue {
    private _image: CachedImage;

    constructor(private cim: CachedImageMaker, public parent: ItemSpecDeriv, public info: Info.SpecDerivValue) {
    }

    get image(): SafeUrl {
        const list = _.flatMap([ROOT, this.parent.specValue.spec.item.dir], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${this.parent.specValue.spec.info.key}/derives/${this.parent.specValue.info.key}/${this.info.key}/illustration.${sux}`));
        if (_.isNil(this._image) || !this._image.isSamePath(list)) {
            this._image = this.cim.create(list);
        }
        return this._image.url;
    }
}

export class ItemMeas {
    private _image: CachedImage;
    current: number;

    constructor(private cim: CachedImageMaker, public item: Item, public info: Info.Measurement) {
        this.current = info.value.initial;
    }

    get image(): SafeUrl {
        if (_.isNil(this._image)) {
            const list = _.map(["svg", "png"], (sux) => `${this.item.dir}/measurements/${this.info.key}/illustration.${sux}`);
            this._image = this.cim.create(list);
        }
        return this._image.url;
    }

    get range(): number[] {
        return _.range(this.info.value.min, this.info.value.max + this.info.value.step, this.info.value.step);
    }
}

class CachedImageMaker {
    constructor(private s3image: S3Image) { }

    create(pathList: string[]): CachedImage {
        return new CachedImage(this.s3image, pathList);
    }
}

class CachedImage {
    private _url: SafeUrl;

    constructor(private s3image: S3Image, public pathList: string[]) {
        this.refresh(1000 * 60 * 10);
    }

    private async load(path: string): Promise<SafeUrl> {
        try {
            return await this.s3image.getUrl(path);
        } catch (ex) {
            logger.warn(() => `Failed to load s3image: ${path}: ${ex}`);
        }
        return null;
    }

    private async refresh(limit: number) {
        try {
            var url;
            var i = 0;
            while (_.isNil(url) && i < this.pathList.length) {
                url = await this.load(this.pathList[i++]);
            }
            this._url = url;
        } finally {
            setTimeout(() => {
                this.refresh(limit);
            }, limit);
        }
    }

    isSamePath(pathList: string[]): boolean {
        return _.isEmpty(_.difference(this.pathList, pathList));
    }

    get url(): SafeUrl {
        return this._url;
    }
}
