import {Injectable} from "@angular/core";

import * as Info from "./_info.d";
import {Item, ItemValue} from "./item";
import {ItemSpec, ItemSpecValue} from "./spec";
import {ItemSpecDeriv, ItemSpecDerivValue} from "./deriv";
import {ItemMeasure} from "./measure";

import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup");

const ROOT = "unauthorized";
const LINEUP = "lineup";
const SPEC_VALUE = "spec-value";
export const INFO_JSON = "info.json.encoded";

const SIDES = ["FRONT", "BACK"];

export function createNewKey(prefix: string, find: (v: string) => any): string {
    var index = 0;
    var key;
    while (_.isNil(key) || !_.isNil(find(key))) {
        key = `${prefix}_${index++}`;
    }
    return key;
}

export function itemDir(key: string): string {
    return `${ROOT}/${LINEUP}/${key}`;
}

function dirItem(o: ItemValue): string {
    return itemDir(o.key);
}

@Injectable()
export class LineupController {
    illust: Illustration;
    lineup: Promise<Item>;

    constructor(private s3image: S3Image) {
        this.illust = new Illustration(s3image);
        this.lineup = this.getAll().then((list) => {
            return new Item(this.illust, list);
        });
    }

    private async getAll(): Promise<ItemValue[]> {
        const rootDir = itemDir("");
        const finds = await this.s3image.s3.list(rootDir);
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

    private async load(key: string): Promise<ItemValue> {
        const text = await this.s3image.s3.read(`${itemDir(key)}/${INFO_JSON}`);
        const info = Base64.decodeJson(text) as Info.ItemValue;
        return new ItemValue(this.illust, key, info);
    }
}

function dirSpecValueRelative(o: ItemSpecValue): string {
    const keys = _.map(o.derives, (v) => v.current.info.key);
    return `${o.info.key}/${_.join(keys, "/")}`
}

function imagesDerivValue(o: ItemSpecDerivValue): string[] {
    const sv = o.deriv.specValue;
    return _.flatMap([ROOT, dirItem(sv.spec.item)], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${sv.spec.info.key}/derives/${sv.info.key}/${o.info.key}/illustration.${sux}`));
}

function imagesSpecValue(o: ItemSpecValue): string[] {
    return _.flatMap([ROOT, dirItem(o.spec.item)], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${o.spec.info.key}/images/${this.dirSpecValueRelative(o)}/illustration.${sux}`));
}

export class Illustration {
    onChanging: OnChanging;
    onRemoving: OnRemoving;

    constructor(public s3image: S3Image) {
        this.onChanging = new OnChanging(s3image.s3);
        this.onRemoving = new OnRemoving(s3image.s3);
    }

    itemTitle(o: ItemValue): CachedImage {
        return this.s3image.createCache([`${dirItem(o)}/title.png`]);
    }

    // SpecSide -> CachedImage
    itemValueCurrent(o: ItemValue): {[key: string]: CachedImage} {
        const names = _.map(o.specs, (spec) => dirSpecValueRelative(spec.current));
        const dir = `${dirItem(o)}/images/${_.join(names, "/")}/`;
        return _.fromPairs(_.map(SIDES, (side) =>
            [side, this.s3image.createCache([`${dir}/${side}.png`])]
        ));
    }

    measure(o: ItemMeasure): CachedImage {
        const list = _.map(["svg", "png"], (sux) => `${dirItem(o.item)}/measurements/${o.info.key}/illustration.${sux}`);
        return this.s3image.createCache(list);
    }

    specValue(o: ItemSpecValue): CachedImage {
        const list = imagesSpecValue(o);
        return this.s3image.createCache(list);
    }

    derivValue(o: ItemSpecDerivValue): CachedImage {
        const list = imagesDerivValue(o);
        return this.s3image.createCache(list);
    }
}

type DoThru = () => Promise<void>;

function refreshIllustrations(item: ItemValue) {
    item.refreshIllustrations();
    item.measurements.forEach((m) => m.refreshIllustrations());
    item.specs.forEach((spec) => {
        spec.availables.forEach((specValue) => {
            specValue.refreshIllustrations();
            specValue.derives.forEach((deriv) => {
                deriv.availables.forEach((derivValue) => {
                    derivValue.refreshIllustrations();
                })
            })
        })
    })
}

class OnChanging {
    constructor(private s3: S3File) { }

    async itemValueKey(o: ItemValue, go: DoThru) {
        const src = dirItem(o);

        await go();

        const dst = dirItem(o);
        await this.s3.moveDir(src, dst);

        refreshIllustrations(o);
    }

    async specKey(o: ItemSpec, go: DoThru) {
        await go();

        refreshIllustrations(o.item);
    }

    async specValueKey(o: ItemSpecValue, go: DoThru) {
        await go();

        refreshIllustrations(o.spec.item);
    }

    async derivKey(o: ItemSpecDeriv, go: DoThru) {
        await go();

        refreshIllustrations(o.specValue.spec.item);
    }

    async derivValueKey(o: ItemSpecDerivValue, go: DoThru) {
        const srcList = imagesDerivValue(o);

        await go();

        const dstList = imagesDerivValue(o);
        await Promise.all(_.map(_.zip(srcList, dstList),
            (pair) => this.s3.move(pair[0], pair[1])
        ));

        refreshIllustrations(o.deriv.specValue.spec.item);
    }
}

class OnRemoving {
    constructor(private s3: S3File) { }

    async itemValue(o: ItemValue, go: DoThru) {
        await go();
        await this.s3.removeDir(dirItem(o));
    }

    async spec(o: ItemSpec, go: DoThru) {
        await go();

        refreshIllustrations(o.item);
    }

    async specValue(o: ItemSpecValue, go: DoThru) {
        await go();

        refreshIllustrations(o.spec.item);
    }

    async deriv(o: ItemSpecDeriv, go: DoThru) {
        await go();

        refreshIllustrations(o.specValue.spec.item);
    }

    async derivValue(o: ItemSpecDerivValue, go: DoThru) {
        await go();

        refreshIllustrations(o.deriv.specValue.spec.item);
    }
}
