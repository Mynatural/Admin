import {Injectable} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./lineup_info.d";
import {S3File, S3Image} from "../aws/s3file";
import {InputInterval} from "../../util/input_interval";
import * as Base64 from "../../util/base64";
import {Logger} from "../../util/logging";

const logger = new Logger("Lineup");

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

@Injectable()
export class LineupController {
    cim: CachedImageMaker;
    lineup: Promise<Lineup>;

    constructor(private s3: S3File, s3image: S3Image) {
        this.cim = new CachedImageMaker(s3image);
        this.lineup = this.getAll().then((list) => {
            return new Lineup(s3, this.cim, list);
        });
    }

    private async getAll(): Promise<LineupValue[]> {
        const rootDir = `${ROOT}/${LINEUP}/`
        const finds = await this.s3.list(rootDir);
        logger.debug(() => `Finds: ${JSON.stringify(finds, null, 4)}`);
        const keys = _.filter(finds.map((path) => {
            if (path.endsWith(`/${INFO_JSON}`)) {
                const l = _.split(path, "/");
                return l[l.length - 2];
            }
            return null;
        }));
        logger.debug(() => `Keys: ${JSON.stringify(keys, null, 4)}`);
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

    private async load(key: string): Promise<LineupValue> {
        const text = await this.s3.read(`${ROOT}/${LINEUP}/${key}/${INFO_JSON}`);
        const info = Base64.decodeJson(text) as Info.LineupValue;
        return new LineupValue(this.s3, this.cim, key, info);
    }
}

export class Lineup {
    constructor(private s3: S3File, private cim: CachedImageMaker, public availables: LineupValue[]) { }

    get(key: string): LineupValue {
        return _.find(this.availables, {"key": key});
    }

    async remove(o: LineupValue): Promise<void> {
        _.remove(this.availables, (a) => _.isEqual(a.key, o.key));
        await this.s3.removeDir(o.dir);
    }

    createNew(): LineupValue {
        const key = createNewKey("new_created", (key) => _.find(this.availables, {"key": key}));
        const one = new LineupValue(this.s3, this.cim, key, {
            name: "新しいラインナップ",
            price: 500,
            description: "",
            specs: [],
            specValues: [],
            measurements: []
        });
        this.availables.unshift(one);
        return one;
    }
}

export class LineupValue {
    specs: ItemSpec[];
    measurements: ItemMeas[];
    private _titleImage: CachedImage;
    private _images: {[key: string]: CachedImage} = {};
    private _changeKey: InputInterval<string>;

    constructor(private s3: S3File, private cim: CachedImageMaker, private _key: string, public info: Info.LineupValue) {
        logger.info(() => `${_key}: ${JSON.stringify(info, null, 4)}`);
        this.specs = _.map(info.specs, (spec) => new ItemSpec(cim, this, spec));
        this.measurements = _.map(info.measurements, (m) => new ItemMeas(cim, this, m));
        this._changeKey = new InputInterval<string>(1000);
    }

    onChangeSpecValue() {
        this._images = {};
    }

    get key(): string {
        return this._key;
    }

    async changeKey(v: string): Promise<void> {
        if (_.isEmpty(v)) return;
        await this._changeKey.update(v, async (v) => {
            logger.debug(() => `Changing lineup key: ${this._key} -> ${v}`);
            const src = this.dir;
            this._key = v;
            await this.s3.moveDir(src, this.dir);
        });
    }

    get dir(): string {
        return `${ROOT}/${LINEUP}/${this.key}`
    }

    get titleImage(): SafeUrl {
        if (_.isNil(this._titleImage)) {
            this._titleImage = this.cim.create([`${this.dir}/title.png`]);
        }
        return this._titleImage.url;
    }

    async changeImage(file: File): Promise<void> {
        if (file) {
            await this.s3.upload(`${this.dir}/title.png`, file);
            this._titleImage = null;
        }
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

    async writeInfo(): Promise<void> {
        const path = `${this.dir}/${INFO_JSON}`;
        await this.s3.write(path, Base64.encodeJson(this.info));
    }

    getSpec(key: string): ItemSpec {
        return _.find(this.specs, (s) => _.isEqual(s.info.key, key));
    }

    removeSpec(o: ItemSpec) {
        _.remove(this.specs, (a) => _.isEqual(a.info.key, o.info.key));
        _.remove(this.info.specs, (a) => _.isEqual(a.key, o.info.key));
    }

    createSpec(): ItemSpec {
        const key = createNewKey("new_spec", (key) => this.getSpec(key));
        const one = new ItemSpec(this.cim, this, {
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
        this.specs.unshift(one);
        this.info.specs.unshift(one.info);
        return one;
    }
}

export class ItemSpec {
    availables: ItemSpecValue[];
    private _current: ItemSpecValue;

    constructor(private cim: CachedImageMaker, public item: LineupValue, public info: Info.Spec) {
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
        const one = new ItemSpecValue(this.cim, this, {
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

    getDeriv(key: string): ItemSpecDeriv {
        return _.find(this.derives, (a) => _.isEqual(key, a.info.key));
    }

    removeDeriv(o: ItemSpecDeriv) {
        _.remove(this.derives, (a) => _.isEqual(a.info.key, o.info.key));
        _.remove(this.info.derives, (a) => _.isEqual(a.key, o.info.key));
    }

    createDeriv(): ItemSpecDeriv {
        const key = createNewKey("new_deriv", (key) => this.getDeriv(key));
        const one = new ItemSpecDeriv(this.cim, this, {
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
        const key = createNewKey("new_deriv_value", (key) => this.get(key));
        const one = new ItemSpecDerivValue(this.cim, this, {
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

    constructor(private cim: CachedImageMaker, public deriv: ItemSpecDeriv, public info: Info.SpecDerivValue) {
    }

    get image(): SafeUrl {
        const sv = this.deriv.specValue;
        const list = _.flatMap([ROOT, sv.spec.item.dir], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${sv.spec.info.key}/derives/${sv.info.key}/${this.info.key}/illustration.${sux}`));
        if (_.isNil(this._image) || !this._image.isSamePath(list)) {
            this._image = this.cim.create(list);
        }
        return this._image.url;
    }
}

export class ItemMeas {
    private _image: CachedImage;
    current: number;

    constructor(private cim: CachedImageMaker, public item: LineupValue, public info: Info.Measurement) {
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
