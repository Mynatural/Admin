import {S3File, S3Image, CachedImage} from "../../aws/s3file";

import {Lineup, LineupValue} from "./lineup";
import {ItemSpec, ItemSpecValue} from "./spec";
import {ItemSpecDeriv, ItemSpecDerivValue} from "./deriv";
import {ItemMeasure} from "./measure";

export const ROOT = "unauthorized";
export const LINEUP = "lineup";
export const SPEC_VALUE = "spec-value";
export const INFO_JSON = "info.json.encoded";

const SIDES = ["FRONT", "BACK"];

export function dirItem(o: LineupValue): string {
    return `${ROOT}/${LINEUP}/${o.key}`;
}

export function dirSpecValueRelative(o: ItemSpecValue): string {
    const keys = _.map(o.derives, (v) => v.current.info.key);
    return `${o.info.key}/${_.join(keys, "/")}`
}

export function createNewKey(prefix: string, find: (v: string) => any): string {
    var index = 0;
    var key;
    while (_.isNil(key) || !_.isNil(find(key))) {
        key = `${prefix}_${index++}`;
    }
    return key;
}

function imagesDerivValue(o: ItemSpecDerivValue): string[] {
    const sv = o.deriv.specValue;
    return _.flatMap([ROOT, dirItem(sv.spec.item)], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${sv.spec.info.key}/derives/${sv.info.key}/${o.info.key}/illustration.${sux}`));
}

function imagesSpecValue(o: ItemSpecValue): string[] {
    return _.flatMap([ROOT, dirItem(o.spec.item)], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${o.spec.info.key}/images/${dirSpecValueRelative(o)}/illustration.${sux}`));
}

export class Illustration {
    onChanging: OnChanging;
    onRemoving: OnRemoving;

    constructor(public s3image: S3Image) {
        this.onChanging = new OnChanging(s3image.s3);
        this.onRemoving = new OnRemoving(s3image.s3);
    }

    itemTitle(o: LineupValue): CachedImage {
        return this.s3image.createCache([`${dirItem(o)}/title.png`]);
    }

    // SpecSide -> CachedImage
    itemValueCurrent(o: LineupValue): {[key: string]: CachedImage} {
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

export type DoThru = () => Promise<void>;

function refreshIllustrations(item: LineupValue) {
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

    async itemValueKey(o: LineupValue, go: DoThru) {
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

    async itemValue(o: LineupValue, go: DoThru) {
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
